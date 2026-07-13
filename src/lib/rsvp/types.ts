export const RSVP_SCOPES = ['ceremony', 'reception', 'both'] as const;
export const ATTENDANCE_STATUSES = ['pending', 'attending', 'declined'] as const;
export const DIETARY_REQUIREMENTS = [
	'gluten_free',
	'vegan',
	'vegetarian',
	'other',
] as const;

export type RsvpScope = (typeof RSVP_SCOPES)[number];
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export type DietaryRequirement = (typeof DIETARY_REQUIREMENTS)[number];

export interface GuestRsvp {
	id: string;
	fullName: string;
	rsvpFor: RsvpScope;
	ceremonyStatus: AttendanceStatus | null;
	receptionStatus: AttendanceStatus | null;
	dietaryRequirements: DietaryRequirement[];
	dietaryOther: string;
	updatedAt: string | null;
}

export interface HouseholdRsvp {
	id: string;
	displayName: string;
	additionalComments: string;
	guests: GuestRsvp[];
}

export interface GuestRsvpSubmission {
	guestId: string;
	ceremonyStatus: Exclude<AttendanceStatus, 'pending'> | null;
	receptionStatus: Exclude<AttendanceStatus, 'pending'> | null;
	dietaryRequirements: DietaryRequirement[];
	dietaryOther: string;
}

export interface HouseholdRsvpSubmission {
	responses: GuestRsvpSubmission[];
	additionalComments: string;
}
