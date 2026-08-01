import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { isAdminEmail } from '../../../lib/admin/server/repository';
import { createAdminSession, setAdminSession } from '../../../lib/admin/server/session';
import { json, sameOrigin } from '../../../lib/admin/server/auth';
import { getSupabaseAdmin } from '../../../lib/rsvp/server/supabase';
export const prerender = false;
export const POST: APIRoute = async ({ request, url, cookies }) => {
	if (!sameOrigin(request, url)) return json({ error: 'Invalid request origin.' }, 403);
	const parsed = z.object({ accessToken: z.string().min(20) }).safeParse(await request.json().catch(() => null));
	if (!parsed.success) return json({ error: 'Invalid sign-in response.' }, 400);
	try {
		const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(parsed.data.accessToken);
		const email = user?.email?.toLowerCase();
		if (error || !email || !(await isAdminEmail(email))) return json({ error: 'Admin access is not authorized.' }, 403);
		const claims = JSON.parse(atob(parsed.data.accessToken.split('.')[1].replaceAll('-', '+').replaceAll('_', '/'))) as { exp?: number };
		const expiresAt = typeof claims.exp === 'number' ? claims.exp : Math.floor(Date.now() / 1000) + 3600;
		setAdminSession(cookies, await createAdminSession(email, expiresAt), expiresAt);
		return json({ ok: true });
	} catch { return json({ error: 'Unable to establish your admin session.' }, 401); }
};
