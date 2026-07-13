create extension if not exists citext with schema extensions;

create type public.rsvp_scope as enum ('ceremony', 'reception', 'both');
create type public.attendance_status as enum ('pending', 'attending', 'declined');
create type public.dietary_requirement as enum (
  'gluten_free',
  'vegan',
  'vegetarian',
  'other'
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(trim(display_name)) between 1 and 200),
  primary_email extensions.citext not null unique,
  additional_comments text check (char_length(additional_comments) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 1 and 200),
  rsvp_for public.rsvp_scope not null,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now()
);

create index guests_household_order_idx
  on public.guests (household_id, display_order, created_at);

create table public.rsvps (
  guest_id uuid primary key references public.guests(id) on delete cascade,
  ceremony_status public.attendance_status,
  reception_status public.attendance_status,
  dietary_requirements public.dietary_requirement[] not null default '{}',
  dietary_other text check (char_length(dietary_other) <= 500),
  updated_at timestamptz not null default now(),
  constraint dietary_other_is_described check (
    not ('other'::public.dietary_requirement = any(dietary_requirements))
    or nullif(trim(dietary_other), '') is not null
  )
);

create table public.invitation_tokens (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invitation_expiry_after_creation check (expires_at > created_at)
);

create index invitation_tokens_household_idx
  on public.invitation_tokens (household_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger households_set_updated_at
before update on public.households
for each row execute function public.set_updated_at();

create trigger rsvps_set_updated_at
before update on public.rsvps
for each row execute function public.set_updated_at();

create function public.submit_household_rsvp(
  p_household_id uuid,
  p_responses jsonb,
  p_additional_comments text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_response jsonb;
  v_guest public.guests%rowtype;
  v_ceremony_status public.attendance_status;
  v_reception_status public.attendance_status;
  v_dietary public.dietary_requirement[];
  v_dietary_other text;
begin
  if p_responses is null or jsonb_typeof(p_responses) <> 'array' then
    raise exception 'Responses must be an array';
  end if;

  if char_length(coalesce(p_additional_comments, '')) > 2000 then
    raise exception 'Additional comments are too long';
  end if;

  perform 1 from public.households where id = p_household_id for update;
  if not found then
    raise exception 'Household not found';
  end if;

  if jsonb_array_length(p_responses) < 1
    or jsonb_array_length(p_responses) <>
      (select count(*) from public.guests where household_id = p_household_id) then
    raise exception 'Every invited guest must have one response';
  end if;

  if (
    select count(distinct item->>'guestId')
    from jsonb_array_elements(p_responses) as item
  ) <> jsonb_array_length(p_responses) then
    raise exception 'Each guest may appear only once';
  end if;

  for v_response in select value from jsonb_array_elements(p_responses)
  loop
    select * into v_guest
    from public.guests
    where id = (v_response->>'guestId')::uuid
      and household_id = p_household_id;

    if not found then
      raise exception 'Response contains a guest outside this household';
    end if;

    v_ceremony_status := nullif(v_response->>'ceremonyStatus', '')::public.attendance_status;
    v_reception_status := nullif(v_response->>'receptionStatus', '')::public.attendance_status;

    if v_guest.rsvp_for in ('ceremony', 'both') then
      if v_ceremony_status is null or v_ceremony_status = 'pending' then
        raise exception 'Ceremony response is required for %', v_guest.full_name;
      end if;
    elsif v_ceremony_status is not null then
      raise exception 'Ceremony response is not applicable for %', v_guest.full_name;
    end if;

    if v_guest.rsvp_for in ('reception', 'both') then
      if v_reception_status is null or v_reception_status = 'pending' then
        raise exception 'Reception response is required for %', v_guest.full_name;
      end if;
    elsif v_reception_status is not null then
      raise exception 'Reception response is not applicable for %', v_guest.full_name;
    end if;

    if jsonb_typeof(coalesce(v_response->'dietaryRequirements', '[]'::jsonb)) <> 'array' then
      raise exception 'Dietary requirements must be an array';
    end if;

    if (
      select count(*) <> count(distinct value)
      from jsonb_array_elements_text(coalesce(v_response->'dietaryRequirements', '[]'::jsonb))
    ) then
      raise exception 'Dietary requirements may not be duplicated';
    end if;

    select coalesce(array_agg(value::public.dietary_requirement), '{}')
      into v_dietary
    from jsonb_array_elements_text(coalesce(v_response->'dietaryRequirements', '[]'::jsonb));

    v_dietary_other := nullif(trim(v_response->>'dietaryOther'), '');

    if v_reception_status is distinct from 'attending' and cardinality(v_dietary) > 0 then
      raise exception 'Dietary requirements only apply to reception attendees';
    end if;

    if 'other'::public.dietary_requirement = any(v_dietary)
      and v_dietary_other is null then
      raise exception 'Other dietary requirements must be described';
    end if;

    if not ('other'::public.dietary_requirement = any(v_dietary)) then
      v_dietary_other := null;
    end if;

    insert into public.rsvps (
      guest_id,
      ceremony_status,
      reception_status,
      dietary_requirements,
      dietary_other
    ) values (
      v_guest.id,
      v_ceremony_status,
      v_reception_status,
      v_dietary,
      v_dietary_other
    )
    on conflict (guest_id) do update set
      ceremony_status = excluded.ceremony_status,
      reception_status = excluded.reception_status,
      dietary_requirements = excluded.dietary_requirements,
      dietary_other = excluded.dietary_other;
  end loop;

  update public.households
  set additional_comments = nullif(trim(p_additional_comments), '')
  where id = p_household_id;
end;
$$;

alter table public.households enable row level security;
alter table public.guests enable row level security;
alter table public.rsvps enable row level security;
alter table public.invitation_tokens enable row level security;

revoke all on table public.households from anon, authenticated;
revoke all on table public.guests from anon, authenticated;
revoke all on table public.rsvps from anon, authenticated;
revoke all on table public.invitation_tokens from anon, authenticated;
revoke all on function public.submit_household_rsvp(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.submit_household_rsvp(uuid, jsonb, text) to service_role;
