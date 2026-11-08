-- Admin guest removal uses the server-only service_role client.
grant delete on table public.guests to service_role;
