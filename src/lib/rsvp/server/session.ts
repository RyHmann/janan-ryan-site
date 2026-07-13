import type { AstroCookies } from 'astro';
import { decodeBase64Url, encodeBase64Url, sign, verify } from './crypto';
import { getServerConfig } from './config';

const COOKIE_NAME = 'rsvp_session';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface SessionPayload {
	v: 1;
	householdId: string;
	invitationId: string;
	exp: number;
}

export interface RsvpSession {
	householdId: string;
	invitationId: string;
}

export async function createSessionToken(
	householdId: string,
	invitationId: string,
	invitationExpiresAt: string,
): Promise<{ token: string; expiresAt: Date }> {
	const { sessionSecret, sessionTtlDays } = getServerConfig();
	const ttlExpiry = Date.now() + sessionTtlDays * 24 * 60 * 60 * 1000;
	const expiresAt = new Date(Math.min(ttlExpiry, new Date(invitationExpiresAt).getTime()));
	const payload: SessionPayload = {
		v: 1,
		householdId,
		invitationId,
		exp: Math.floor(expiresAt.getTime() / 1000),
	};
	const encodedPayload = encodeBase64Url(JSON.stringify(payload));
	const signature = await sign(encodedPayload, sessionSecret);
	return { token: `${encodedPayload}.${signature}`, expiresAt };
}

export async function readRsvpSession(cookies: AstroCookies): Promise<RsvpSession | null> {
	const token = cookies.get(COOKIE_NAME)?.value;
	if (!token) return null;

	const [encodedPayload, signature, extra] = token.split('.');
	if (!encodedPayload || !signature || extra) return null;

	const { sessionSecret } = getServerConfig();
	if (!(await verify(encodedPayload, signature, sessionSecret))) return null;

	try {
		const payload = JSON.parse(decodeBase64Url(encodedPayload)) as Partial<SessionPayload>;
		if (
			payload.v !== 1 ||
			typeof payload.householdId !== 'string' ||
			!UUID_PATTERN.test(payload.householdId) ||
			typeof payload.invitationId !== 'string' ||
			!UUID_PATTERN.test(payload.invitationId) ||
			typeof payload.exp !== 'number' ||
			payload.exp <= Math.floor(Date.now() / 1000)
		) {
			return null;
		}
		return { householdId: payload.householdId, invitationId: payload.invitationId };
	} catch {
		return null;
	}
}

export function setSessionCookie(cookies: AstroCookies, token: string, expiresAt: Date): void {
	cookies.set(COOKIE_NAME, token, {
		httpOnly: true,
		secure: import.meta.env.PROD,
		sameSite: 'lax',
		path: '/',
		expires: expiresAt,
	});
}

export function clearSessionCookie(cookies: AstroCookies): void {
	cookies.delete(COOKIE_NAME, { path: '/' });
}
