# Issue Tracker

Use this list for known product issues that should be revisited. Check an item off only after its
fix has been verified in the UI.

## Open

- [ ] **RSVP submission does not visibly update the form.**
  - **User expectation:** After confirming an RSVP, the form should clearly show the saved RSVP
    choices (and ideally a confirmation that they were saved).
  - **Current behaviour:** Confirming an RSVP appears to do nothing in the UI.
  - **Observed during:** Local Supabase end-to-end RSVP testing.
  - **To investigate:** Confirm whether the API saves the responses, whether the client receives a
    successful response, and whether the form refreshes its displayed RSVP state afterward.
