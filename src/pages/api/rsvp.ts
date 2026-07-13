import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import {
	DIETARY_REQUIREMENTS,
	type HouseholdRsvpSubmission,
} from '../../lib/rsvp/types';
import {
	getHouseholdRsvp,
	isInvitationSessionActive,
	saveHouseholdRsvp,
} from '../../lib/rsvp/server/repository';
import { clearSessionCookie, readRsvpSession } from '../../lib/rsvp/server/session';

export const prerender = false;

const attendance = z.enum(['attending', 'declined']);
const submissionSchema = z.object({
	responses: z
		.array(
			z.object({
				guestId: z.uuid(),
				ceremonyStatus: attendance.nullable(),
				receptionStatus: attendance.nullable(),
				dietaryRequirements: z.array(z.enum(DIETARY_REQUIREMENTS)).max(4),
				dietaryOther: z.string().max(500),
			}),
		)
		.min(1),
	additionalComments: z.string().max(2000),
});

const jsonHeaders = {
	'content-type': 'application/json; charset=utf-8',
	'cache-control': 'no-store',
};

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

async function authenticatedHouseholdId(cookies: Parameters<APIRoute>[0]['cookies']) {
	const session = await readRsvpSession(cookies);
	if (!session) return null;
	const active = await isInvitationSessionActive(session.invitationId, session.householdId);
	if (!active) {
		clearSessionCookie(cookies);
		return null;
	}
	return session.householdId;
}

export const GET: APIRoute = async ({ cookies }) => {
	try {
		const householdId = await authenticatedHouseholdId(cookies);
		if (!householdId) return json({ error: 'RSVP access is required.' }, 401);

		const household = await getHouseholdRsvp(householdId);
		if (!household) {
			clearSessionCookie(cookies);
			return json({ error: 'This invitation is no longer available.' }, 401);
		}
		return json({ household });
	} catch (error) {
		console.error('Unable to load RSVP', error);
		return json({ error: 'The RSVP service is temporarily unavailable.' }, 503);
	}
};

export const POST: APIRoute = async ({ request, cookies, url }) => {
	const origin = request.headers.get('origin');
	if (origin && origin !== url.origin) return json({ error: 'Invalid request origin.' }, 403);

	try {
		const householdId = await authenticatedHouseholdId(cookies);
		if (!householdId) return json({ error: 'Your RSVP session has expired.' }, 401);

		let body: unknown;
		try {
			body = await request.json();
		} catch {
			return json({ error: 'The RSVP submission is not valid JSON.' }, 400);
		}

		const parsed = submissionSchema.safeParse(body);
		if (!parsed.success) {
			return json({ error: 'Please complete every required RSVP field.' }, 400);
		}

		await saveHouseholdRsvp(householdId, parsed.data as HouseholdRsvpSubmission);
		const household = await getHouseholdRsvp(householdId);
		return json({ household });
	} catch (error) {
		console.error('Unable to save RSVP', error);
		return json({ error: 'We could not save your RSVP. Please try again.' }, 503);
	}
};
