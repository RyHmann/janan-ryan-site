import type {
	AttendanceStatus,
	DietaryRequirement,
	HouseholdRsvp,
	HouseholdRsvpSubmission,
	RsvpScope,
} from '../types';
import { getSupabaseAdmin } from './supabase';

interface InvitationRecord {
	id: string;
	household_id: string;
	expires_at: string;
	revoked_at: string | null;
}

interface HouseholdRecord {
	id: string;
	display_name: string;
	additional_comments: string | null;
}

interface GuestRecord {
	id: string;
	full_name: string;
	rsvp_for: RsvpScope;
}

interface RsvpRecord {
	guest_id: string;
	ceremony_status: AttendanceStatus | null;
	reception_status: AttendanceStatus | null;
	dietary_requirements: DietaryRequirement[];
	dietary_other: string | null;
	updated_at: string;
}

function databaseError(context: string, error: { message: string }): Error {
	console.error(`${context}: ${error.message}`);
	return new Error('The RSVP service is temporarily unavailable. Please try again.');
}

export async function findActiveInvitation(tokenHash: string): Promise<InvitationRecord | null> {
	const supabase = getSupabaseAdmin();
	const { data, error } = await supabase
		.from('invitation_tokens')
		.select('id, household_id, expires_at, revoked_at')
		.eq('token_hash', tokenHash)
		.maybeSingle();

	if (error) throw databaseError('Unable to look up invitation', error);
	if (!data) return null;
	const invitation = data as InvitationRecord;
	if (invitation.revoked_at || new Date(invitation.expires_at).getTime() <= Date.now()) return null;

	const { error: updateError } = await supabase
		.from('invitation_tokens')
		.update({ last_used_at: new Date().toISOString() })
		.eq('token_hash', tokenHash);
	if (updateError) console.error(`Unable to update invitation usage: ${updateError.message}`);

	return invitation;
}

export async function isInvitationSessionActive(
	invitationId: string,
	householdId: string,
): Promise<boolean> {
	const { data, error } = await getSupabaseAdmin()
		.from('invitation_tokens')
		.select('id')
		.eq('id', invitationId)
		.eq('household_id', householdId)
		.is('revoked_at', null)
		.gt('expires_at', new Date().toISOString())
		.maybeSingle();
	if (error) throw databaseError('Unable to validate RSVP session', error);
	return Boolean(data);
}

export async function getHouseholdRsvp(householdId: string): Promise<HouseholdRsvp | null> {
	const supabase = getSupabaseAdmin();
	const [householdResult, guestsResult] = await Promise.all([
		supabase
			.from('households')
			.select('id, display_name, additional_comments')
			.eq('id', householdId)
			.maybeSingle(),
		supabase
			.from('guests')
			.select('id, full_name, rsvp_for')
			.eq('household_id', householdId)
			.order('display_order')
			.order('created_at'),
	]);

	if (householdResult.error) throw databaseError('Unable to load household', householdResult.error);
	if (guestsResult.error) throw databaseError('Unable to load guests', guestsResult.error);
	if (!householdResult.data) return null;

	const household = householdResult.data as HouseholdRecord;
	const guests = guestsResult.data as GuestRecord[];
	const guestIds = guests.map((guest) => guest.id);
	const rsvpsResult = guestIds.length
		? await supabase
			.from('rsvps')
			.select('guest_id, ceremony_status, reception_status, dietary_requirements, dietary_other, updated_at')
			.in('guest_id', guestIds)
		: { data: [], error: null };
	if (rsvpsResult.error) throw databaseError('Unable to load responses', rsvpsResult.error);

	const rsvps = new Map(
		(rsvpsResult.data as RsvpRecord[]).map((rsvp) => [rsvp.guest_id, rsvp]),
	);

	return {
		id: household.id,
		displayName: household.display_name,
		additionalComments: household.additional_comments ?? '',
		guests: guests.map((guest) => {
			const rsvp = rsvps.get(guest.id);
			return {
				id: guest.id,
				fullName: guest.full_name,
				rsvpFor: guest.rsvp_for,
				ceremonyStatus: rsvp?.ceremony_status ?? null,
				receptionStatus: rsvp?.reception_status ?? null,
				dietaryRequirements: rsvp?.dietary_requirements ?? [],
				dietaryOther: rsvp?.dietary_other ?? '',
				updatedAt: rsvp?.updated_at ?? null,
			};
		}),
	};
}

export async function saveHouseholdRsvp(
	householdId: string,
	submission: HouseholdRsvpSubmission,
): Promise<void> {
	const { error } = await getSupabaseAdmin().rpc('submit_household_rsvp', {
		p_household_id: householdId,
		p_responses: submission.responses,
		p_additional_comments: submission.additionalComments,
	});
	if (error) throw databaseError('Unable to save responses', error);
}
