-- The server-only Supabase secret key uses the service_role database role.
-- RLS remains enabled; service_role bypasses RLS and is never exposed to clients.
grant select on table public.households to service_role;
grant select on table public.guests to service_role;
grant select on table public.rsvps to service_role;
grant select, update on table public.invitation_tokens to service_role;
