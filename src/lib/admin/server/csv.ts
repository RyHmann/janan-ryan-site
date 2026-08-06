import { z } from 'astro/zod';

const requiredHeaders = ['household key', 'household name', 'email', 'guest name'];

export interface ImportHousehold {
	key: string;
	displayName: string;
	primaryEmail: string;
	guests: { fullName: string; displayOrder: number }[];
}

function parseCsv(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let quoted = false;
	for (let index = 0; index < text.length; index += 1) {
		const char = text[index];
		if (quoted) {
			if (char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
			else if (char === '"') quoted = false;
			else cell += char;
			continue;
		}
		if (char === '"') { quoted = true; continue; }
		if (char === ',') { row.push(cell); cell = ''; continue; }
		if (char === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; continue; }
		cell += char;
	}
	if (quoted) throw new Error('The CSV contains an unclosed quoted value.');
	if (cell || row.length) { row.push(cell); rows.push(row); }
	return rows.filter((values) => values.some((value) => value.trim()));
}

const email = z.email();
const clean = (value: string) => value.trim();
const header = (value: string) => clean(value).replace(/^\uFEFF/, '').toLowerCase().replace(/\s+/g, ' ');

export function parseGuestImport(csv: string): ImportHousehold[] {
	if (csv.length > 1_000_000) throw new Error('A batch CSV may not exceed 1 MB.');
	const rows = parseCsv(csv);
	if (rows.length < 2) throw new Error('Upload a header row and at least one guest row.');
	if (rows.length > 1001) throw new Error('A batch may contain at most 1,000 guest rows.');
	const headings = rows[0].map(header);
	const indexes = requiredHeaders.map((name) => headings.indexOf(name));
	if (indexes.some((index) => index < 0)) throw new Error('CSV headers must be: Household key, Household name, Email, Guest name.');
	if (new Set(indexes).size !== indexes.length) throw new Error('Each required CSV header may appear only once.');

	const households = new Map<string, ImportHousehold>();
	const emails = new Map<string, string>();
	for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
		const row = rows[rowIndex];
		const [key, displayName, primaryEmail, guestName] = indexes.map((index) => clean(row[index] ?? ''));
		const rowNumber = rowIndex + 1;
		if (!key || !displayName || !primaryEmail || !guestName) throw new Error(`Row ${rowNumber} needs a household key, household name, email, and guest name.`);
		if (key.length > 100 || displayName.length > 200 || guestName.length > 200) throw new Error(`Row ${rowNumber} contains a value that is too long.`);
		if (!email.safeParse(primaryEmail).success) throw new Error(`Row ${rowNumber} has an invalid email address.`);
		const emailKey = primaryEmail.toLowerCase();
		const existingKey = emails.get(emailKey);
		if (existingKey && existingKey !== key) throw new Error(`Row ${rowNumber} reuses an email address for a different household key.`);
		emails.set(emailKey, key);
		const household = households.get(key);
		if (!household) households.set(key, { key, displayName, primaryEmail: emailKey, guests: [{ fullName: guestName, displayOrder: 1 }] });
		else {
			if (household.displayName !== displayName || household.primaryEmail !== emailKey) throw new Error(`Row ${rowNumber} does not match the name and email already used for household “${key}”.`);
			if (household.guests.some((guest) => guest.fullName === guestName)) throw new Error(`Row ${rowNumber} duplicates a guest in household “${key}”.`);
			household.guests.push({ fullName: guestName, displayOrder: household.guests.length + 1 });
		}
	}
	for (const household of households.values()) if (household.guests.length > 20) throw new Error(`Household “${household.key}” has more than 20 guests.`);
	return [...households.values()];
}

export function endOfAucklandDay(date: string): string | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
	const [year, month, day] = date.split('-').map(Number);
	const localAsUtc = Date.UTC(year, month - 1, day, 23, 59, 59);
	const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(localAsUtc));
	const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
	const displayedAsUtc = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'));
	const result = new Date(localAsUtc - (displayedAsUtc - localAsUtc));
	return Number.isNaN(result.getTime()) ? null : result.toISOString();
}

export const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
