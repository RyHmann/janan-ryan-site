import { getSupabaseAdmin } from '../../rsvp/server/supabase';
import { sha256Hex } from '../../rsvp/server/crypto';
import type { RsvpScope } from '../../rsvp/types';

export interface AdminGuest { id: string; fullName: string; rsvpFor: RsvpScope; ceremonyStatus: string | null; receptionStatus: string | null; dietaryRequirements: string[]; dietaryOther: string; updatedAt: string | null }
export interface AdminHousehold { id: string; displayName: string; primaryEmail: string; additionalComments: string; createdAt: string; guests: AdminGuest[]; invitations: { id: string; expiresAt: string; revokedAt: string | null; lastUsedAt: string | null; createdAt: string }[] }

export async function isAdminEmail(email: string) {
	const { data, error } = await getSupabaseAdmin().from('admin_users').select('email').eq('email', email).maybeSingle();
	if (error) throw error;
	return Boolean(data);
}
export async function listHouseholds(search = ''): Promise<AdminHousehold[]> {
	const db = getSupabaseAdmin();
	let query = db.from('households').select('id, display_name, primary_email, additional_comments, created_at').order('created_at', { ascending: false });
	if (search) query = query.or(`display_name.ilike.%${search.replaceAll(',', '')}%,primary_email.ilike.%${search.replaceAll(',', '')}%`);
	const { data: households, error } = await query;
	if (error) throw error;
	const ids = (households ?? []).map((h) => h.id);
	if (!ids.length) return [];
	const [{ data: guests, error: guestError }, { data: rsvps, error: rsvpError }, { data: invitations, error: inviteError }] = await Promise.all([
		db.from('guests').select('id, household_id, full_name, rsvp_for').in('household_id', ids).order('display_order'),
		db.from('rsvps').select('guest_id, ceremony_status, reception_status, dietary_requirements, dietary_other, updated_at'),
		db.from('invitation_tokens').select('id, household_id, expires_at, revoked_at, last_used_at, created_at').in('household_id', ids).order('created_at', { ascending: false }),
	]);
	if (guestError || rsvpError || inviteError) throw guestError ?? rsvpError ?? inviteError;
	const rsvpByGuest = new Map((rsvps ?? []).map((r) => [r.guest_id, r]));
	return (households ?? []).map((h) => ({ id: h.id, displayName: h.display_name, primaryEmail: h.primary_email, additionalComments: h.additional_comments ?? '', createdAt: h.created_at, guests: (guests ?? []).filter((g) => g.household_id === h.id).map((g) => { const r = rsvpByGuest.get(g.id); return { id: g.id, fullName: g.full_name, rsvpFor: g.rsvp_for as RsvpScope, ceremonyStatus: r?.ceremony_status ?? null, receptionStatus: r?.reception_status ?? null, dietaryRequirements: r?.dietary_requirements ?? [], dietaryOther: r?.dietary_other ?? '', updatedAt: r?.updated_at ?? null }; }), invitations: (invitations ?? []).filter((i) => i.household_id === h.id).map((i) => ({ id: i.id, expiresAt: i.expires_at, revokedAt: i.revoked_at, lastUsedAt: i.last_used_at, createdAt: i.created_at })) }));
}
export async function createHousehold(input: { displayName: string; primaryEmail: string; guests: { fullName: string; rsvpFor: RsvpScope }[] }) {
	const { data, error } = await getSupabaseAdmin().rpc('create_admin_household', { p_display_name: input.displayName, p_primary_email: input.primaryEmail, p_guests: input.guests });
	if (error) throw error; return data as string;
}
export async function createInvitation(householdId: string, expiresAt: string) {
	const rawToken = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
	const { error } = await getSupabaseAdmin().from('invitation_tokens').insert({ household_id: householdId, token_hash: await sha256Hex(rawToken), expires_at: expiresAt });
	if (error) throw error; return rawToken;
}
export async function revokeInvitation(id: string) { const { error } = await getSupabaseAdmin().from('invitation_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', id).is('revoked_at', null); if (error) throw error; }

export async function createInvitationBatch(input: {
	households: { displayName: string; primaryEmail: string; guests: { fullName: string; displayOrder: number }[]; tokenHash: string }[];
	expiresAt: string;
}) {
	const { error } = await getSupabaseAdmin().rpc('create_admin_household_batch', {
		p_households: input.households,
		p_expires_at: input.expiresAt,
	});
	if (error) throw error;
}
