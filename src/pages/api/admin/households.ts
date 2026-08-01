import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { createHousehold, listHouseholds } from '../../../lib/admin/server/repository';
import { json, requireAdmin, sameOrigin } from '../../../lib/admin/server/auth';
export const prerender = false;
const scope = z.enum(['ceremony', 'reception', 'both']);
export const GET: APIRoute = async (context) => { if (!(await requireAdmin(context))) return json({ error: 'Admin access is required.' }, 401); try { return json({ households: await listHouseholds(context.url.searchParams.get('q')?.trim() ?? '') }); } catch (error) { console.error('Unable to list households', error); return json({ error: 'Unable to load households.' }, 503); } };
export const POST: APIRoute = async (context) => { if (!sameOrigin(context.request, context.url)) return json({ error: 'Invalid request origin.' }, 403); if (!(await requireAdmin(context))) return json({ error: 'Admin access is required.' }, 401); const parsed = z.object({ displayName: z.string().trim().min(1).max(200), primaryEmail: z.email(), guests: z.array(z.object({ fullName: z.string().trim().min(1).max(200), rsvpFor: scope })).min(1).max(20) }).safeParse(await context.request.json().catch(() => null)); if (!parsed.success) return json({ error: 'Enter a household, email, and at least one named guest.' }, 400); try { return json({ id: await createHousehold(parsed.data) }, 201); } catch (error) { console.error('Unable to create household', error); return json({ error: 'Unable to create this household. The email may already exist.' }, 400); } };
