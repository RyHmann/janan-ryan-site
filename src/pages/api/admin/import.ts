import type { APIRoute } from 'astro';
import { createInvitationBatch } from '../../../lib/admin/server/repository';
import { csvCell, endOfAucklandDay, parseGuestImport } from '../../../lib/admin/server/csv';
import { json, requireAdmin, sameOrigin } from '../../../lib/admin/server/auth';
import { sha256Hex } from '../../../lib/rsvp/server/crypto';

export const prerender = false;

export const POST: APIRoute = async (context) => {
	if (!sameOrigin(context.request, context.url)) return json({ error: 'Invalid request origin.' }, 403);
	if (!(await requireAdmin(context))) return json({ error: 'Admin access is required.' }, 401);
	const body = await context.request.json().catch(() => null) as { csv?: unknown; expiresOn?: unknown } | null;
	if (!body || typeof body.csv !== 'string' || typeof body.expiresOn !== 'string') return json({ error: 'Upload a CSV and choose an expiry date.' }, 400);
	const expiresAt = endOfAucklandDay(body.expiresOn);
	if (!expiresAt || new Date(expiresAt) <= new Date()) return json({ error: 'Choose a future expiry date. Links expire at 11:59 pm New Zealand time.' }, 400);
	try {
		const households = parseGuestImport(body.csv);
		const invitations = await Promise.all(households.map(async (household) => {
			const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
			return { ...household, token, tokenHash: await sha256Hex(token) };
		}));
		await createInvitationBatch({ households: invitations.map(({ displayName, primaryEmail, guests, tokenHash }) => ({ displayName, primaryEmail, guests, tokenHash })), expiresAt });
		const header = ['Household key', 'Household name', 'Email', 'RSVP URL', 'Invitation expiry (NZ time)', 'Send status'];
		const rows = invitations.map((invite) => [invite.key, invite.displayName, invite.primaryEmail, new URL(`/rsvp/access?token=${invite.token}`, context.url.origin).toString(), `${body.expiresOn} 11:59 pm NZ time`, '']);
		return new Response([header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n'), { status: 201, headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="wedding-yamm-invitations.csv"', 'cache-control': 'no-store' } });
	} catch (error) {
		console.error('Unable to import invitation batch', error);
		return json({ error: error instanceof Error && !error.message.includes('duplicate key') ? error.message : 'Unable to import this batch. An email may already exist.' }, 400);
	}
};
