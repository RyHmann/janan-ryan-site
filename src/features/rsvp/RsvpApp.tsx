import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import {
	DIETARY_REQUIREMENTS,
	type AttendanceStatus,
	type DietaryRequirement,
	type GuestRsvp,
	type HouseholdRsvp,
	type HouseholdRsvpSubmission,
} from '../../lib/rsvp/types';
import './RsvpApp.css';

type Answer = Exclude<AttendanceStatus, 'pending'>;
type AccessError = 'invalid' | 'unavailable';

interface Props {
	accessError?: AccessError;
}

const apiUrl = `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}api/rsvp`;

const dietaryLabels: Record<DietaryRequirement, string> = {
	gluten_free: 'Gluten-free',
	vegan: 'Vegan',
	vegetarian: 'Vegetarian',
	other: 'Other',
};

function isApplicable(guest: GuestRsvp, part: 'ceremony' | 'reception'): boolean {
	return guest.rsvpFor === part || guest.rsvpFor === 'both';
}

function asAnswer(value: AttendanceStatus | null): Answer | null {
	return value === 'attending' || value === 'declined' ? value : null;
}

function AttendanceChoice({
	guestId,
	value,
	onChange,
}: {
	guestId: string;
	value: Answer | null;
	onChange: (value: Answer) => void;
}) {
	const name = `${guestId}-attendance`;
	return (
		<fieldset className="rsvp-attendance">
			<legend>Attendance</legend>
			<div className="rsvp-choice-row">
				<label>
					<input
						type="radio"
						name={name}
						value="attending"
						checked={value === 'attending'}
						onChange={() => onChange('attending')}
						required
					/>
					<span>Attending</span>
				</label>
				<label>
					<input
						type="radio"
						name={name}
						value="declined"
						checked={value === 'declined'}
						onChange={() => onChange('declined')}
					/>
					<span>Unable to attend</span>
				</label>
			</div>
		</fieldset>
	);
}

function messageFromResponse(body: unknown, fallback: string): string {
	if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
		return body.error;
	}
	return fallback;
}

export default function RsvpApp({ accessError }: Props) {
	const [household, setHousehold] = useState<HouseholdRsvp | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const successRef = useRef<HTMLDivElement>(null);
	const hasSubmitted = household?.guests.some((guest) => guest.ceremonyStatus !== null || guest.receptionStatus !== null) ?? false;

	useEffect(() => {
		const controller = new AbortController();
		void fetch(apiUrl, { credentials: 'same-origin', signal: controller.signal })
			.then(async (response) => {
				const body: unknown = await response.json();
				if (!response.ok) throw new Error(messageFromResponse(body, 'Unable to load this RSVP.'));
				if (!body || typeof body !== 'object' || !('household' in body)) {
					throw new Error('The RSVP response was incomplete.');
				}
				setHousehold(body.household as HouseholdRsvp);
			})
			.catch((loadError: unknown) => {
				if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
				setError(loadError instanceof Error ? loadError.message : 'Unable to load this RSVP.');
			})
			.finally(() => setLoading(false));
		return () => controller.abort();
	}, []);

	function updateGuest(guestId: string, update: (guest: GuestRsvp) => GuestRsvp) {
		setSaved(false);
		setHousehold((current) =>
			current
				? { ...current, guests: current.guests.map((guest) => (guest.id === guestId ? update(guest) : guest)) }
				: current,
		);
	}

	function setAttendance(guestId: string, value: Answer) {
		updateGuest(guestId, (guest) => ({
			...guest,
			ceremonyStatus: isApplicable(guest, 'ceremony') ? value : null,
			receptionStatus: isApplicable(guest, 'reception') ? value : null,
			...(value === 'declined'
				? { dietaryRequirements: [], dietaryOther: '' }
				: {}),
		}));
	}

	function toggleDietary(guestId: string, requirement: DietaryRequirement) {
		updateGuest(guestId, (guest) => {
			const selected = guest.dietaryRequirements.includes(requirement);
			const requirements = selected
				? guest.dietaryRequirements.filter((item) => item !== requirement)
				: [...guest.dietaryRequirements, requirement];
			return {
				...guest,
				dietaryRequirements: requirements,
				dietaryOther: requirement === 'other' && selected ? '' : guest.dietaryOther,
			};
		});
	}

	async function submit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!household) return;
		setError(null);

		for (const guest of household.guests) {
			const attendance = isApplicable(guest, 'reception') ? guest.receptionStatus : guest.ceremonyStatus;
			if (!asAnswer(attendance)) {
				setError(`Please tell us whether ${guest.fullName} will be attending.`);
				return;
			}
			if (guest.dietaryRequirements.includes('other') && !guest.dietaryOther.trim()) {
				setError(`Please describe the other dietary requirement for ${guest.fullName}.`);
				return;
			}
		}

		const submission: HouseholdRsvpSubmission = {
			responses: household.guests.map((guest) => ({
				guestId: guest.id,
				ceremonyStatus: isApplicable(guest, 'ceremony') ? asAnswer(guest.ceremonyStatus ?? guest.receptionStatus) : null,
				receptionStatus: isApplicable(guest, 'reception') ? asAnswer(guest.receptionStatus ?? guest.ceremonyStatus) : null,
				dietaryRequirements: guest.receptionStatus === 'attending' || guest.ceremonyStatus === 'attending' ? guest.dietaryRequirements : [],
				dietaryOther: guest.receptionStatus === 'attending' || guest.ceremonyStatus === 'attending' ? guest.dietaryOther : '',
			})),
			additionalComments: household.additionalComments,
		};

		setSaving(true);
		try {
			const response = await fetch(apiUrl, {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(submission),
			});
			const body: unknown = await response.json();
			if (!response.ok) throw new Error(messageFromResponse(body, 'Unable to save your RSVP.'));
			if (body && typeof body === 'object' && 'household' in body && body.household) {
				setHousehold(body.household as HouseholdRsvp);
			}
			setSaved(true);
			requestAnimationFrame(() => {
				successRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
				successRef.current?.focus({ preventScroll: true });
			});
		} catch (saveError) {
			setError(saveError instanceof Error ? saveError.message : 'Unable to save your RSVP.');
		} finally {
			setSaving(false);
		}
	}

	if (loading) {
		return <section className="rsvp-shell panel rsvp-state">Loading your invitation…</section>;
	}

	if (!household) {
		const accessMessage =
			accessError === 'invalid'
				? 'This RSVP link is invalid or has expired.'
				: accessError === 'unavailable'
					? 'The RSVP service is temporarily unavailable.'
					: error;
		return (
			<section className="rsvp-shell panel rsvp-state">
				<p className="rsvp-eyebrow">RSVP access</p>
				<h1>Open your personal invitation link</h1>
				<p>{accessMessage ?? 'Please use the personal RSVP link from your invitation email.'}</p>
				<p>If you need a fresh link, reply to our invitation email and we’ll help.</p>
			</section>
		);
	}

	return (
		<section className="rsvp-shell panel">
			<header className="rsvp-header">
				<p className="rsvp-eyebrow">Wedding RSVP</p>
				<h1>{household.displayName}</h1>
				<p>Please respond for each person listed below.</p>
			</header>

			{saved && (
				<div className="rsvp-success" role="status" tabIndex={-1} ref={successRef}>
					<strong>Thank you—your RSVP has been saved.</strong>
					<span>You can return with your invitation link if anything changes.</span>
				</div>
			)}

			<form onSubmit={submit}>
				<div className="rsvp-guest-list">
					{household.guests.map((guest) => (
						<article className="rsvp-guest" key={guest.id}>
							<div className="rsvp-guest-heading">
								<h2>{guest.fullName}</h2>
								<span>{guest.rsvpFor === 'both' ? 'Ceremony & reception' : guest.rsvpFor}</span>
							</div>
							<div className="rsvp-event-grid">
								{(isApplicable(guest, 'ceremony') || isApplicable(guest, 'reception')) && (
									<AttendanceChoice
										guestId={guest.id}
										value={asAnswer(guest.receptionStatus ?? guest.ceremonyStatus)}
										onChange={(value) => setAttendance(guest.id, value)}
									/>
								)}
							</div>

							{guest.receptionStatus === 'attending' && (
								<fieldset className="rsvp-dietary">
									<legend>Dietary requirements</legend>
									<p>Select all that apply. Leave blank if none.</p>
									<div className="rsvp-checkbox-grid">
										{DIETARY_REQUIREMENTS.map((requirement) => (
											<label key={requirement}>
												<input
													type="checkbox"
													checked={guest.dietaryRequirements.includes(requirement)}
													onChange={() => toggleDietary(guest.id, requirement)}
												/>
												<span>{dietaryLabels[requirement]}</span>
											</label>
										))}
									</div>
									{guest.dietaryRequirements.includes('other') && (
										<label className="rsvp-other">
											<span>Please describe</span>
											<input
												type="text"
												value={guest.dietaryOther}
												maxLength={500}
												onChange={(event) =>
													updateGuest(guest.id, (current) => ({
														...current,
														dietaryOther: event.target.value,
													}))
												}
												required
											/>
										</label>
									)}
								</fieldset>
							)}
						</article>
					))}
				</div>

				<label className="rsvp-comments">
					<span>Additional Comments</span>
					<textarea
						value={household.additionalComments}
						maxLength={2000}
						rows={5}
						onChange={(event) => {
							setSaved(false);
							setHousehold({ ...household, additionalComments: event.target.value });
						}}
					/>
					<small>{household.additionalComments.length}/2000</small>
				</label>

				{error && <div className="rsvp-error" role="alert">{error}</div>}

				<div className="rsvp-actions">
					{saved && <span className="rsvp-inline-success" role="status">RSVP saved ✓</span>}
					<button type="submit" disabled={saving}>{saving ? 'Saving…' : hasSubmitted ? 'Update RSVP' : 'Submit RSVP'}</button>
				</div>
			</form>
		</section>
	);
}
