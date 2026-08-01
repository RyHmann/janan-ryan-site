import type { AstroCookies } from 'astro';
import { decodeBase64Url, encodeBase64Url, sign, verify } from '../../rsvp/server/crypto';
import { getServerConfig } from '../../rsvp/server/config';

const COOKIE_NAME = 'admin_session';
interface Payload { v: 1; email: string; exp: number }

export async function createAdminSession(email: string, expiresAt: number): Promise<string> {
	const payload = encodeBase64Url(JSON.stringify({ v: 1, email, exp: expiresAt } satisfies Payload));
	return `${payload}.${await sign(payload, getServerConfig().sessionSecret)}`;
}

export async function readAdminSession(cookies: AstroCookies): Promise<string | null> {
	const token = cookies.get(COOKIE_NAME)?.value;
	if (!token) return null;
	const [payload, signature, extra] = token.split('.');
	if (!payload || !signature || extra || !(await verify(payload, signature, getServerConfig().sessionSecret))) return null;
	try {
		const data = JSON.parse(decodeBase64Url(payload)) as Partial<Payload>;
		if (data.v !== 1 || typeof data.email !== 'string' || !/^\S+@\S+\.\S+$/.test(data.email) || typeof data.exp !== 'number' || data.exp <= Date.now() / 1000) return null;
		return data.email.toLowerCase();
	} catch { return null; }
}

export function setAdminSession(cookies: AstroCookies, token: string, expiresAt: number) {
	cookies.set(COOKIE_NAME, token, { httpOnly: true, secure: import.meta.env.PROD, sameSite: 'lax', path: '/', expires: new Date(expiresAt * 1000) });
}
export function clearAdminSession(cookies: AstroCookies) { cookies.delete(COOKIE_NAME, { path: '/' }); }
