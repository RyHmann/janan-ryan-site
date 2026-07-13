import type { APIRoute } from 'astro';
import { sha256Hex } from '../../lib/rsvp/server/crypto';
import { findActiveInvitation } from '../../lib/rsvp/server/repository';
import { createSessionToken, setSessionCookie } from '../../lib/rsvp/server/session';

export const prerender = false;

function rsvpRedirect(request: Request, reason?: string): Response {
	const url = new URL('/rsvp', request.url);
	if (reason) url.searchParams.set('access', reason);
	return new Response(null, {
		status: 303,
		headers: {
			location: url.toString(),
			'cache-control': 'no-store',
			'referrer-policy': 'no-referrer',
		},
	});
}

export const GET: APIRoute = async ({ request, cookies }) => {
	const token = new URL(request.url).searchParams.get('token')?.trim();
	if (!token || token.length < 32 || token.length > 200) return rsvpRedirect(request, 'invalid');

	try {
		const invitation = await findActiveInvitation(await sha256Hex(token));
		if (!invitation) return rsvpRedirect(request, 'invalid');

		const session = await createSessionToken(
			invitation.household_id,
			invitation.id,
			invitation.expires_at,
		);
		setSessionCookie(cookies, session.token, session.expiresAt);
		return rsvpRedirect(request);
	} catch (error) {
		console.error('Unable to accept RSVP invitation', error);
		return rsvpRedirect(request, 'unavailable');
	}
};
