import type { APIRoute } from 'astro';
import { listHouseholds } from '../../../lib/admin/server/repository';
import { requireAdmin } from '../../../lib/admin/server/auth';
export const prerender = false;
const cell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
export const GET: APIRoute = async (context) => {
	if (!(await requireAdmin(context))) return new Response('Admin access is required.', { status: 401, headers: { 'cache-control': 'no-store' } });
	try {
		const households = await listHouseholds();
		const header = ['Household', 'Email', 'Guest', 'Invitation scope', 'Ceremony', 'Reception', 'Dietary requirements', 'Dietary other', 'Additional comments', 'RSVP updated'];
		const rows = households.flatMap((household) => household.guests.map((guest) => [household.displayName, household.primaryEmail, guest.fullName, guest.rsvpFor, guest.ceremonyStatus ?? 'pending', guest.receptionStatus ?? 'pending', guest.dietaryRequirements.join('; '), guest.dietaryOther, household.additionalComments, guest.updatedAt ?? '']));
		return new Response([header, ...rows].map((row) => row.map(cell).join(',')).join('\n'), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="wedding-rsvps.csv"', 'cache-control': 'no-store' } });
	} catch (error) { console.error('Unable to export RSVPs', error); return new Response('Unable to export RSVPs.', { status: 503, headers: { 'cache-control': 'no-store' } }); }
};
