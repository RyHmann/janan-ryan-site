create function public.create_admin_household_batch(
  p_households jsonb,
  p_expires_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_household jsonb;
  v_guest jsonb;
  v_household_id uuid;
  v_email extensions.citext;
begin
  if p_households is null or jsonb_typeof(p_households) <> 'array'
    or jsonb_array_length(p_households) < 1 then
    raise exception 'At least one household is required';
  end if;
  if p_expires_at <= now() then raise exception 'Invitation expiry must be in the future'; end if;

  for v_household in select value from jsonb_array_elements(p_households)
  loop
    v_email := lower(trim(v_household->>'primaryEmail'))::extensions.citext;
    if nullif(trim(v_household->>'displayName'), '') is null
      or nullif(trim(v_household->>'primaryEmail'), '') is null
      or nullif(trim(v_household->>'tokenHash'), '') is null
      or jsonb_typeof(v_household->'guests') <> 'array'
      or jsonb_array_length(v_household->'guests') < 1 then
      raise exception 'Invalid household import data';
    end if;
    if exists (select 1 from public.households where primary_email = v_email) then
      raise exception 'A household with this email already exists';
    end if;
    insert into public.households (display_name, primary_email)
    values (trim(v_household->>'displayName'), v_email)
    returning id into v_household_id;
    for v_guest in select value from jsonb_array_elements(v_household->'guests')
    loop
      insert into public.guests (household_id, full_name, rsvp_for, display_order)
      values (v_household_id, trim(v_guest->>'fullName'), 'both', coalesce((v_guest->>'displayOrder')::integer, 0));
    end loop;
    insert into public.invitation_tokens (household_id, token_hash, expires_at)
    values (v_household_id, v_household->>'tokenHash', p_expires_at);
  end loop;
end;
$$;

revoke all on function public.create_admin_household_batch(jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.create_admin_household_batch(jsonb, timestamptz) to service_role;
