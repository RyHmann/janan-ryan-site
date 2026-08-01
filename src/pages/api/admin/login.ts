import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { isAdminEmail } from '../../../lib/admin/server/repository';
import { json, sameOrigin } from '../../../lib/admin/server/auth';
import { getSupabaseAdmin } from '../../../lib/rsvp/server/supabase';
export const prerender = false;
export const POST: APIRoute = async ({ request, url }) => {
	if (!sameOrigin(request, url)) return json({ error: 'Invalid request origin.' }, 403);
	const parsed = z.object({ email: z.email() }).safeParse(await request.json().catch(() => null));
	if (!parsed.success) return json({ error: 'Enter a valid email address.' }, 400);
	const email = parsed.data.email.toLowerCase();
	try {
		if (!(await isAdminEmail(email))) return json({ error: 'This email is not authorized for admin access.' }, 403);
		const { error } = await getSupabaseAdmin().auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: new URL('/admin/callback', url.origin).toString() } });
		if (error) throw error;
		return json({ ok: true });
	} catch (error) { console.error('Unable to send admin sign-in link', error); return json({ error: 'Unable to send a sign-in link right now.' }, 503); }
};
