-- TheJordans - database schema, security rules and functions.
--
-- Admin accounts are Supabase Auth users listed in public.admins. Every table
-- is protected by row-level security: only admins can read or change data.
-- The public website only reaches the database through the three
-- SECURITY DEFINER functions at the bottom (track, quote, subscribe), which
-- expose exactly what a visitor is allowed to see or submit.

create extension if not exists pgcrypto;

/* ------------------------------------------------------------------ */
/* Admins                                                              */
/* ------------------------------------------------------------------ */
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

/* ------------------------------------------------------------------ */
/* Settings (single row) - edited from the dashboard                  */
/* ------------------------------------------------------------------ */
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  google_maps_api_key text not null default '',
  company_name text not null default 'TheJordans Logistics & Freight',
  company_address text not null default '',
  company_phone text not null default '',
  company_email text not null default '',
  company_website text not null default '',
  currency text not null default 'USD',
  tax_rate numeric not null default 0 check (tax_rate between 0 and 100),
  invoice_terms text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

/* ------------------------------------------------------------------ */
/* Shipments                                                           */
/* ------------------------------------------------------------------ */
create sequence if not exists public.invoice_seq start 1001;

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  tracking_number text not null unique check (tracking_number ~ '^[A-Z0-9-]{4,40}$'),
  invoice_number text not null unique
    default ('INV-' || to_char(now(), 'YYYY') || '-' || nextval('public.invoice_seq')),
  status text not null default 'Pending'
    check (status in ('Pending', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'On Hold', 'Cancelled')),
  origin text not null check (length(origin) between 1 and 160),
  destination text not null check (length(destination) between 1 and 160),
  origin_lat double precision,
  origin_lng double precision,
  dest_lat double precision,
  dest_lng double precision,
  route_polyline text,                      -- encoded Google polyline (road route), null = straight line
  route_distance_km numeric check (route_distance_km >= 0),
  freight_type text not null default 'Truck Freight',
  service text not null default '',
  weight text not null default '',
  dimensions text not null default '',
  estimated_delivery date,
  departure_at timestamptz,                 -- when the package starts moving
  speed_kmh numeric not null default 60 check (speed_kmh > 0 and speed_kmh <= 1200),
  -- movement checkpoint, maintained only by the trigger below:
  -- distance covered = progress_km + (moving ? speed * time since progress_at : 0)
  progress_km numeric not null default 0,
  progress_at timestamptz not null default now(),
  sender jsonb not null default '{}'::jsonb,
  receiver jsonb not null default '{}'::jsonb,
  notes text not null default '',
  invoice jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shipments_updated_at_idx on public.shipments (updated_at desc);

create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  date timestamptz not null default now(),
  status text not null
    check (status in ('Pending', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'On Hold', 'Cancelled')),
  location text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists shipment_events_shipment_idx on public.shipment_events (shipment_id, date desc);

-- Distance covered at a moment in time. Only "In Transit" and "Out for Delivery" move.
create or replace function public.covered_km(
  p_progress_km numeric,
  p_progress_at timestamptz,
  p_speed numeric,
  p_status text,
  p_total numeric,
  p_at timestamptz default now()
)
returns numeric
language sql
stable
as $$
  select case when p_total is null then v else least(v, p_total) end
  from (
    select p_progress_km
      + case when p_status in ('In Transit', 'Out for Delivery')
          then p_speed * greatest(0, extract(epoch from (p_at - p_progress_at))) / 3600.0
          else 0 end as v
  ) x;
$$;

-- Keeps the movement checkpoint honest. The client never sets progress directly:
-- whenever the status (or speed) changes, the distance covered so far is frozen
-- into progress_km, so "On Hold" keeps the package exactly where it was and
-- going back to "In Transit" continues from that point.
create or replace function public.shipments_before_write()
returns trigger
language plpgsql
as $$
begin
  new.tracking_number := upper(regexp_replace(coalesce(new.tracking_number, ''), '\s', '', 'g'));

  if tg_op = 'INSERT' then
    if new.tracking_number = '' then
      loop
        new.tracking_number := 'TJ' || lpad((floor(random() * 1e10))::bigint::text, 10, '0');
        exit when not exists (select 1 from public.shipments where tracking_number = new.tracking_number);
      end loop;
    end if;
    new.progress_km := case when new.status = 'Delivered' then coalesce(new.route_distance_km, 0) else 0 end;
    new.progress_at := coalesce(new.departure_at, now());
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  new.progress_km := old.progress_km;
  new.progress_at := old.progress_at;
  new.created_at := old.created_at;
  new.invoice_number := old.invoice_number;
  new.updated_at := now();

  if (new.origin_lat, new.origin_lng, new.dest_lat, new.dest_lng)
     is distinct from (old.origin_lat, old.origin_lng, old.dest_lat, old.dest_lng) then
    -- a different route: start again from the origin
    new.progress_km := 0;
    new.progress_at := coalesce(new.departure_at, now());
  elsif new.status is distinct from old.status or new.speed_kmh is distinct from old.speed_kmh then
    new.progress_km := public.covered_km(old.progress_km, old.progress_at, old.speed_kmh, old.status,
                                         coalesce(new.route_distance_km, old.route_distance_km));
    new.progress_at := greatest(now(), old.progress_at);   -- keeps a future departure time
  elsif new.departure_at is distinct from old.departure_at and old.progress_km = 0 then
    new.progress_at := coalesce(new.departure_at, now());
  end if;

  if new.status = 'Delivered' and new.route_distance_km is not null then
    new.progress_km := new.route_distance_km;
  end if;
  return new;
end;
$$;

drop trigger if exists shipments_before_write on public.shipments;
create trigger shipments_before_write
  before insert or update on public.shipments
  for each row execute function public.shipments_before_write();

-- History entries for creation and for status changes made in the edit form.
create or replace function public.shipments_after_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.shipment_events (shipment_id, date, status, location, note)
    values (new.id, now(), new.status, new.origin, 'Shipment created');
  elsif new.status is distinct from old.status and pg_trigger_depth() = 1 then
    -- depth 1 = changed directly by an admin (not by posting a tracking update)
    insert into public.shipment_events (shipment_id, date, status, location, note)
    values (new.id, now(), new.status, '', 'Status updated to ' || new.status);
  end if;
  return null;
end;
$$;

drop trigger if exists shipments_after_write on public.shipments;
create trigger shipments_after_write
  after insert or update on public.shipments
  for each row execute function public.shipments_after_write();

-- A shipment's status always follows its most recent tracking update.
create or replace function public.events_sync_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid := coalesce(new.shipment_id, old.shipment_id);
  latest text;
begin
  -- deletes cascading from a deleted shipment run nested; nothing to sync
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return null;
  end if;
  select status into latest
  from public.shipment_events
  where shipment_id = sid
  order by date desc, created_at desc
  limit 1;
  if latest is not null then
    update public.shipments set status = latest where id = sid and status is distinct from latest;
  end if;
  return null;
end;
$$;

drop trigger if exists events_sync_status on public.shipment_events;
create trigger events_sync_status
  after insert or update or delete on public.shipment_events
  for each row execute function public.events_sync_status();

/* ------------------------------------------------------------------ */
/* Quote requests + newsletter subscribers                             */
/* ------------------------------------------------------------------ */
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  email text not null check (length(email) <= 160 and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text not null check (length(phone) between 1 and 40),
  dimensions text not null default '',
  freight_type text not null default '',
  incoterms text not null default '',
  origin text not null default '',
  destination text not null default '',
  service text not null default '',
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  created_at timestamptz not null default now()
);

/* ------------------------------------------------------------------ */
/* Row-level security                                                  */
/* ------------------------------------------------------------------ */
alter table public.admins enable row level security;
alter table public.settings enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_events enable row level security;
alter table public.quotes enable row level security;
alter table public.subscribers enable row level security;

revoke all on public.admins, public.settings, public.shipments, public.shipment_events,
              public.quotes, public.subscribers from anon;
grant select, insert, update, delete on public.admins, public.settings, public.shipments,
              public.shipment_events, public.quotes, public.subscribers to authenticated;
grant usage on sequence public.invoice_seq to authenticated;

drop policy if exists "admins read admins" on public.admins;
create policy "admins read admins" on public.admins for select to authenticated using (public.is_admin());
drop policy if exists "admins add admins" on public.admins;
create policy "admins add admins" on public.admins for insert to authenticated with check (public.is_admin());
drop policy if exists "admins remove other admins" on public.admins;
create policy "admins remove other admins" on public.admins for delete to authenticated
  using (public.is_admin() and user_id <> auth.uid());

drop policy if exists "admins read settings" on public.settings;
create policy "admins read settings" on public.settings for select to authenticated using (public.is_admin());
drop policy if exists "admins update settings" on public.settings;
create policy "admins update settings" on public.settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins manage shipments" on public.shipments;
create policy "admins manage shipments" on public.shipments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins manage events" on public.shipment_events;
create policy "admins manage events" on public.shipment_events for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins manage quotes" on public.quotes;
create policy "admins manage quotes" on public.quotes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins manage subscribers" on public.subscribers;
create policy "admins manage subscribers" on public.subscribers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

/* ------------------------------------------------------------------ */
/* Public functions used by the website                                */
/* ------------------------------------------------------------------ */

-- Tracking lookup. Returns null when the code is unknown. No contact details.
create or replace function public.track_shipment(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'trackingNumber', s.tracking_number,
    'status', s.status,
    'origin', s.origin,
    'destination', s.destination,
    'originLat', s.origin_lat,
    'originLng', s.origin_lng,
    'destLat', s.dest_lat,
    'destLng', s.dest_lng,
    'routePolyline', s.route_polyline,
    'routeDistanceKm', s.route_distance_km,
    'speedKmh', s.speed_kmh,
    'progressKm', s.progress_km,
    'progressAt', s.progress_at,
    'freightType', s.freight_type,
    'service', s.service,
    'weight', s.weight,
    'estimatedDelivery', s.estimated_delivery,
    'departureAt', s.departure_at,
    'updatedAt', s.updated_at,
    'serverNow', now(),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('date', e.date, 'status', e.status, 'location', e.location, 'note', e.note)
                       order by e.date desc, e.created_at desc)
      from public.shipment_events e where e.shipment_id = s.id
    ), '[]'::jsonb)
  )
  from public.shipments s
  where s.tracking_number = upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
$$;

-- Settings the website needs (map key + contact details).
create or replace function public.get_public_settings()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'googleMapsApiKey', google_maps_api_key,
    'companyName', company_name,
    'companyPhone', company_phone,
    'companyEmail', company_email
  )
  from public.settings where id = 1;
$$;

-- "Request a quote" form.
create or replace function public.submit_quote(p jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := left(btrim(coalesce(p ->> 'name', '')), 120);
  v_email text := lower(left(btrim(coalesce(p ->> 'email', '')), 160));
  v_phone text := left(btrim(coalesce(p ->> 'phone', '')), 40);
begin
  if v_name = '' or v_email = '' or v_phone = '' then
    raise exception 'Please fill in your name, email and phone number.' using errcode = '22023';
  end if;
  if v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Please enter a valid email address.' using errcode = '22023';
  end if;
  -- basic flood protection
  if (select count(*) from public.quotes where email = v_email and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'You have sent several requests already. Our team will be in touch shortly.' using errcode = '22023';
  end if;
  insert into public.quotes (name, email, phone, dimensions, freight_type, incoterms, origin, destination, service)
  values (
    v_name, v_email, v_phone,
    left(btrim(coalesce(p ->> 'dimensions', '')), 80),
    left(btrim(coalesce(p ->> 'freightType', '')), 60),
    left(btrim(coalesce(p ->> 'incoterms', '')), 20),
    left(btrim(coalesce(p ->> 'origin', '')), 160),
    left(btrim(coalesce(p ->> 'destination', '')), 160),
    left(btrim(coalesce(p ->> 'service', '')), 60)
  );
  return true;
end;
$$;

-- Footer newsletter form. Returns 'subscribed' or 'exists'.
create or replace function public.subscribe(p_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(left(btrim(coalesce(p_email, '')), 160));
begin
  if v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Please enter a valid email address.' using errcode = '22023';
  end if;
  insert into public.subscribers (email) values (v_email) on conflict (email) do nothing;
  return case when found then 'subscribed' else 'exists' end;
end;
$$;

revoke execute on function public.track_shipment(text), public.get_public_settings(),
                           public.submit_quote(jsonb), public.subscribe(text) from public;
grant execute on function public.track_shipment(text), public.get_public_settings(),
                          public.submit_quote(jsonb), public.subscribe(text) to anon, authenticated;
