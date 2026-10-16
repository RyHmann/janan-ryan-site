-- Admin RSVP management uses the server-only service_role client.
grant insert, update on table public.rsvps to service_role;
grant update on table public.households to service_role;
