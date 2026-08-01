import type { APIRoute } from 'astro';
import { clearAdminSession } from '../../../lib/admin/server/session';
import { json, sameOrigin } from '../../../lib/admin/server/auth';
export const prerender = false;
export const POST: APIRoute = async ({ request, url, cookies }) => { if (!sameOrigin(request, url)) return json({ error: 'Invalid request origin.' }, 403); clearAdminSession(cookies); return json({ ok: true }); };
