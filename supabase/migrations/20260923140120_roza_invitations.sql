-- All access goes through authenticated/validated Next.js API routes using a server secret.
-- RLS intentionally has no anon/authenticated policies: guests cannot read tables or call RPCs directly.
begin;

create table if not exists public.roza_events (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 80),
  data jsonb not null check (jsonb_typeof(data) = 'object' and data ? 'slug' and data->>'slug' = slug),
  created_at timestamptz not null default now()
);
create table if not exists public.roza_responses (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null references public.roza_events(slug) on delete cascade,
  guest_token text not null check (guest_token ~ '^[a-f0-9]{64}$'),
  name text not null check (length(name) between 2 and 100),
  attendance text not null check (attendance in ('attending','declined')),
  plus_ones integer not null default 0 check (plus_ones between 0 and 5),
  dietary text not null default '' check (length(dietary) <= 500),
  message text not null default '' check (length(message) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_slug,guest_token),
  check (attendance = 'attending' or (plus_ones = 0 and dietary = ''))
);
create index if not exists roza_responses_event_updated_idx on public.roza_responses(event_slug,updated_at desc);
create table if not exists public.roza_opens (
  event_slug text not null references public.roza_events(slug) on delete cascade,
  guest_token text not null check (guest_token ~ '^[a-f0-9]{64}$'),
  opened_at timestamptz not null default now(),
  primary key(event_slug,guest_token)
);
create table if not exists public.roza_rate_limits (
  key text primary key check (key ~ '^[a-f0-9]{64}$'),
  hits integer not null default 1 check (hits > 0),
  expires_at timestamptz not null default now() + interval '2 minutes'
);
create index if not exists roza_rate_limits_expiry_idx on public.roza_rate_limits(expires_at);

alter table public.roza_events enable row level security;
alter table public.roza_responses enable row level security;
alter table public.roza_opens enable row level security;
alter table public.roza_rate_limits enable row level security;
revoke all on public.roza_events,public.roza_responses,public.roza_opens,public.roza_rate_limits from public,anon,authenticated;
grant select,insert,update,delete on public.roza_events,public.roza_responses,public.roza_opens,public.roza_rate_limits to service_role;

create or replace function public.roza_get_event(p_slug text)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select data from public.roza_events where slug = p_slug;
$$;
create or replace function public.roza_create_event(p_event jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  insert into public.roza_events(slug,data) values(p_event->>'slug',p_event) returning data;
$$;
create or replace function public.roza_update_event(p_event jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  update public.roza_events set data=p_event where slug=p_event->>'slug' returning data;
$$;
create or replace function public.roza_record_open(p_slug text,p_guest_token text)
returns void language sql security invoker set search_path = '' as $$
  insert into public.roza_opens(event_slug,guest_token) values(p_slug,p_guest_token) on conflict do nothing;
$$;
create or replace function public.roza_consume_rate_limit(p_key text)
returns integer language plpgsql security invoker set search_path = '' as $$
declare v_hits integer;
begin
  delete from public.roza_rate_limits where expires_at < now();
  insert into public.roza_rate_limits(key,hits) values(p_key,1)
  on conflict(key) do update set hits=public.roza_rate_limits.hits+1 returning hits into v_hits;
  return v_hits;
end;
$$;
create or replace function public.roza_save_rsvp(p_response jsonb,p_guest_token text)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_event jsonb;
begin
  select data into v_event from public.roza_events where slug=p_response->>'eventSlug' for share;
  if v_event is null then raise exception 'Invitation not found' using errcode='23503'; end if;
  if (current_timestamp at time zone (v_event->>'timezone'))::date > (v_event->>'replyBy')::date then
    raise exception 'RSVP deadline passed' using errcode='P0001';
  end if;
  insert into public.roza_responses(event_slug,guest_token,name,attendance,plus_ones,dietary,message)
  values(p_response->>'eventSlug',p_guest_token,p_response->>'name',p_response->>'attendance',
    case when p_response->>'attendance'='attending' then (p_response->>'plusOnes')::integer else 0 end,
    case when p_response->>'attendance'='attending' then coalesce(p_response->>'dietary','') else '' end,
    coalesce(p_response->>'message',''))
  on conflict(event_slug,guest_token) do update set name=excluded.name,attendance=excluded.attendance,
    plus_ones=excluded.plus_ones,dietary=excluded.dietary,message=excluded.message,updated_at=now();
end;
$$;
create or replace function public.roza_dashboard(p_slug text)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'events',(select coalesce(jsonb_agg(data order by created_at desc),'[]'::jsonb) from public.roza_events),
    'opens',(select count(*) from public.roza_opens where event_slug=p_slug),
    'metrics',(select jsonb_build_object('responses',count(*),'attending',coalesce(sum(case when attendance='attending' then 1+plus_ones else 0 end),0),'declined',count(*) filter(where attendance='declined')) from public.roza_responses where event_slug=p_slug),
    'guests',(select coalesce(jsonb_agg(to_jsonb(guest) order by guest.updated_at desc),'[]'::jsonb) from (
      select id,name,attendance,plus_ones,dietary,message,created_at,updated_at from public.roza_responses
      where event_slug=p_slug order by updated_at desc limit 1000
    ) guest),
    'updatedAt',now()
  );
$$;

revoke all on function public.roza_get_event(text),public.roza_create_event(jsonb),public.roza_update_event(jsonb),public.roza_record_open(text,text),public.roza_consume_rate_limit(text),public.roza_save_rsvp(jsonb,text),public.roza_dashboard(text) from public,anon,authenticated;
grant execute on function public.roza_get_event(text),public.roza_create_event(jsonb),public.roza_update_event(jsonb),public.roza_record_open(text,text),public.roza_consume_rate_limit(text),public.roza_save_rsvp(jsonb,text),public.roza_dashboard(text) to service_role;

-- Demo event is inserted below without overwriting an existing invitation.
insert into public.roza_events(slug,data) values ('adele-and-oliver', '{"slug":"adele-and-oliver","names":"Adele & Oliver","initials":"A & O","kind":"Wedding celebration","date":"2027-06-19","time":"16:00","timezone":"Europe/Rome","venue":"Villa Balbiano","location":"Lake Como, Italy","address":"Via Regina, 2, 22010 Ossuccio CO, Italy","replyBy":"2027-05-19","dressCode":"Black tie · A touch of romance","message":"With full hearts and our favorite people, we begin our forever. We would be so delighted to have you by our side.","schedule":[{"time":"4:00 PM","title":"The ceremony","description":"A promise of forever, overlooking the lake."},{"time":"5:00 PM","title":"A little aperitivo","description":"Raise a glass in the gardens as the sun softens."},{"time":"7:00 PM","title":"Dinner & dancing","description":"An evening of candlelight, good company, and celebration."}]}'::jsonb) on conflict do nothing;
commit;
