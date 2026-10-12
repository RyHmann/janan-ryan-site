import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { updateAdminRsvp } from '../../../lib/admin/server/repository';
import { json, requireAdmin, sameOrigin } from '../../../lib/admin/server/auth';
export const prerender = false;
export const PUT: APIRoute = async (context) => {
	if (!sameOrigin(context.request, context.url)) return json({ error: 'Invalid request origin.' }, 403);
	if (!(await requireAdmin(context))) return json({ error: 'Admin access is required.' }, 401);
	const parsed = z.object({ guestId: z.uuid(), attendance: z.enum(['pending', 'attending', 'declined']), dietaryRequirements: z.array(z.enum(['gluten_free', 'vegan', 'vegetarian', 'other'])).max(4), dietaryOther: z.string().max(500), additionalComments: z.string().max(2000) }).safeParse(await context.request.json().catch(() => null));
	if (!parsed.success) return json({ error: 'Check the RSVP details and try again.' }, 400);
	try { await updateAdminRsvp(parsed.data); return json({ ok: true }); }
	catch (error) { console.error('Unable to update RSVP', error); return json({ error: 'Unable to update this RSVP.' }, 400); }
};
