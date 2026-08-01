create table public.admin_users (
  email extensions.citext primary key,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on table public.admin_users from anon, authenticated;
grant select, insert, update, delete on table public.admin_users to service_role;
grant insert on table public.households to service_role;
grant insert on table public.guests to service_role;
grant insert on table public.invitation_tokens to service_role;

-- Add the couple's two real addresses in a follow-up, private migration before enabling /admin.
-- Keeping addresses out of source control avoids publishing personal contact data.

create function public.create_admin_household(
  p_display_name text,
  p_primary_email text,
  p_guests jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_household_id uuid;
  v_guest jsonb;
  v_index integer := 0;
begin
  if p_guests is null or jsonb_typeof(p_guests) <> 'array' or jsonb_array_length(p_guests) < 1 then
    raise exception 'At least one guest is required';
  end if;
  insert into public.households (display_name, primary_email)
  values (trim(p_display_name), trim(p_primary_email))
  returning id into v_household_id;

  for v_guest in select value from jsonb_array_elements(p_guests)
  loop
    insert into public.guests (household_id, full_name, rsvp_for, display_order)
    values (v_household_id, trim(v_guest->>'fullName'), (v_guest->>'rsvpFor')::public.rsvp_scope, v_index);
    v_index := v_index + 1;
  end loop;
  return v_household_id;
end;
$$;

revoke all on function public.create_admin_household(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_admin_household(text, text, jsonb) to service_role;
