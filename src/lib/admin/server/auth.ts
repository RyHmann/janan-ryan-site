import type { APIRoute } from 'astro';
import { clearAdminSession, readAdminSession } from './session';
import { isAdminEmail } from './repository';

export const noStore = { 'cache-control': 'no-store' };
export function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...noStore, 'content-type': 'application/json; charset=utf-8' } }); }
export function sameOrigin(request: Request, url: URL) { const origin = request.headers.get('origin'); return !origin || origin === url.origin; }
export async function requireAdmin(context: Pick<Parameters<APIRoute>[0], 'cookies'>): Promise<string | null> {
	const email = await readAdminSession(context.cookies);
	if (!email) return null;
	try { if (await isAdminEmail(email)) return email; } catch (error) { console.error('Unable to authorize admin', error); }
	clearAdminSession(context.cookies); return null;
}
