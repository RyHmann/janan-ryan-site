import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { addHouseholdMember } from '../../../../../lib/admin/server/repository';
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
