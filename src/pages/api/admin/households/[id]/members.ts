import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { addHouseholdMember, removeHouseholdMember } from '../../../../../lib/admin/server/repository';
import { json, requireAdmin, sameOrigin } from '../../../../../lib/admin/server/auth';
export const prerender = false;
export const POST: APIRoute = async (context) => {
	if (!sameOrigin(context.request, context.url)) return json({ error: 'Invalid request origin.' }, 403);
	if (!(await requireAdmin(context))) return json({ error: 'Admin access is required.' }, 401);
	const parsed = z.object({ fullName: z.string().trim().min(1).max(200) }).safeParse(await context.request.json().catch(() => null));
	if (!parsed.success) return json({ error: 'Enter the new member’s name.' }, 400);
	try { return json({ id: await addHouseholdMember(context.params.id!, parsed.data.fullName) }, 201); }
	catch (error) { console.error('Unable to add household member', error); return json({ error: 'Unable to add this household member.' }, 400); }
};
export const DELETE: APIRoute = async (context) => {
	if (!sameOrigin(context.request, context.url)) return json({ error: 'Invalid request origin.' }, 403);
	if (!(await requireAdmin(context))) return json({ error: 'Admin access is required.' }, 401);
	const parsed = z.object({ guestId: z.uuid() }).safeParse(await context.request.json().catch(() => null));
	if (!parsed.success) return json({ error: 'Choose a guest to remove.' }, 400);
	try { await removeHouseholdMember(context.params.id!, parsed.data.guestId); return json({ ok: true }); }
	catch (error) { console.error('Unable to remove household member', error); return json({ error: error instanceof Error ? error.message : 'Unable to remove this household member.' }, 400); }
};
