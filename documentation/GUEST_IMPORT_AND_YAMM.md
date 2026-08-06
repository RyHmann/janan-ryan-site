# Guest import and YAMM delivery

The RSVP admin dashboard can import a guest list, create one household invitation per email, and
download a YAMM-ready CSV. Apply the accompanying Supabase migration before using this feature.

## Prepare Google Sheets

Create a guest-list tab with these exact headers. Each row is one named guest.

| Household key | Household name | Email | Guest name |
| --- | --- | --- | --- |
| smith-family | The Smith Family | alex@example.com | Alex Smith |
| smith-family | The Smith Family | alex@example.com | Sam Smith |

`Household key` groups people into one RSVP and one shared invitation URL. It must be consistent
for every row in a household. All imported guests are invited to both the ceremony and reception.

Export this tab as a CSV from Google Sheets.

## Import and download

1. Sign in at `/admin`.
2. In **Import guest list and generate links**, choose the CSV and the RSVP expiry date.
   Every link expires at **11:59 pm New Zealand time** on that date.
3. Select **Import & download YAMM CSV**.
4. Keep the resulting `wedding-yamm-invitations.csv` private and import it into a separate Google
   Sheets mail-merge tab.

The download contains `Household key`, `Household name`, `Email`, `RSVP URL`, expiry, and a blank
`Send status` column. Use the RSVP URL merge field in YAMM.

The raw invitation URLs are not stored in Supabase. If a download is lost, revoke the applicable
invitation and issue a replacement from the household's admin view.

## Validation and safety

The import is all-or-nothing. It rejects the whole batch if a required header/value is missing, an
email is invalid, a household has inconsistent name/email rows, a guest is duplicated within a
household, or an email already exists in the RSVP system. This prevents accidental changes to
households that may already have RSVP responses.

Before sending, import the output CSV into Sheets, send a test through YAMM to yourselves, and
open the resulting RSVP link.
