-- 1) Status names: "Pending" -> "Label Created", "Picked Up" -> "Facility Received".
-- 2) Delivery photos: an admin can attach a photo to any tracking update. Visitors
--    see that a photo exists, but only get the image after entering the
--    receiver's postal code (checked here in the database, with an attempt limit).

/* ---------------- status names ---------------- */
alter table public.shipments drop constraint if exists shipments_status_check;
alter table public.shipment_events drop constraint if exists shipment_events_status_check;

-- rename existing rows without firing the timeline / email triggers
alter table public.shipments disable trigger user;
alter table public.shipment_events disable trigger user;
update public.shipment_events set status = case status when 'Pending' then 'Label Created' when 'Picked Up' then 'Facility Received' end
  where status in ('Pending', 'Picked Up');
update public.shipments set status = case status when 'Pending' then 'Label Created' when 'Picked Up' then 'Facility Received' end
  where status in ('Pending', 'Picked Up');
alter table public.shipments enable trigger user;
alter table public.shipment_events enable trigger user;

alter table public.shipments alter column status set default 'Label Created';
alter table public.shipments add constraint shipments_status_check
  check (status in ('Label Created', 'Facility Received', 'In Transit', 'Out for Delivery', 'Delivered', 'On Hold', 'Cancelled'));
alter table public.shipment_events add constraint shipment_events_status_check
  check (status in ('Label Created', 'Facility Received', 'In Transit', 'Out for Delivery', 'Delivered', 'On Hold', 'Cancelled'));

-- A dashboard that has not been updated yet may still send the old names:
-- translate them instead of rejecting the save.
create or replace function public.status_alias()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Pending' then
    new.status := 'Label Created';
  elsif new.status = 'Picked Up' then
    new.status := 'Facility Received';
  end if;
  return new;
end;
$$;
drop trigger if exists a_status_alias on public.shipments;
create trigger a_status_alias before insert or update of status on public.shipments
  for each row execute function public.status_alias();
drop trigger if exists a_status_alias on public.shipment_events;
create trigger a_status_alias before insert or update of status on public.shipment_events
  for each row execute function public.status_alias();

/* ---------------- delivery photos ---------------- */
-- The image itself (a compressed JPEG data URL), one per tracking update.
create table if not exists public.event_photos (
  event_id uuid primary key references public.shipment_events (id) on delete cascade,
  data text not null check (data like 'data:image/%' and length(data) <= 4000000),
  created_at timestamptz not null default now()
);
alter table public.event_photos enable row level security;
revoke all on public.event_photos from anon;
grant select, insert, update, delete on public.event_photos to authenticated;
drop policy if exists "admins manage event photos" on public.event_photos;
create policy "admins manage event photos" on public.event_photos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Wrong postal codes, to stop anyone guessing their way through.
create schema if not exists private;
create table if not exists private.photo_attempts (
  shipment_id uuid not null,
  at timestamptz not null default now()
);
create index if not exists photo_attempts_idx on private.photo_attempts (shipment_id, at desc);

create or replace function public.delivery_photo(p_code text, p_event_id uuid, p_postal text)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_id uuid;
  v_postal text;
  v_given text := upper(regexp_replace(coalesce(p_postal, ''), '[^A-Za-z0-9]', '', 'g'));
  v_photo text;
begin
  select s.id, upper(regexp_replace(coalesce(s.receiver ->> 'postalCode', ''), '[^A-Za-z0-9]', '', 'g'))
    into v_id, v_postal
  from public.shipments s
  where s.tracking_number = upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));

  if v_id is null then
    return jsonb_build_object('error', 'not_found');
  end if;
  if v_postal = '' then
    return jsonb_build_object('error', 'no_postal');
  end if;
  if (select count(*) from private.photo_attempts where shipment_id = v_id and at > now() - interval '15 minutes') >= 8 then
    return jsonb_build_object('error', 'too_many');
  end if;
  if v_given <> v_postal then
    insert into private.photo_attempts (shipment_id) values (v_id);
    delete from private.photo_attempts where at < now() - interval '1 day';
    return jsonb_build_object('error', 'wrong_postal');
  end if;

  select p.data into v_photo
  from public.event_photos p
  join public.shipment_events e on e.id = p.event_id
  where p.event_id = p_event_id and e.shipment_id = v_id;

  if v_photo is null then
    return jsonb_build_object('error', 'no_photo');
  end if;
  return jsonb_build_object('photo', v_photo);
end;
$$;
revoke all on function public.delivery_photo(text, uuid, text) from public;
grant execute on function public.delivery_photo(text, uuid, text) to anon, authenticated;

/* ---------------- public tracking: event ids + photo flag ---------------- */
create or replace function public.track_shipment(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'trackingNumber', s.tracking_number,
    'invoiceNumber', s.invoice_number,
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
    'dimensions', s.dimensions,
    'pieceType', s.piece_type,
    'packageDescription', s.package_description,
    'estimatedDelivery', s.estimated_delivery,
    'estimatedDeliveryTime', s.estimated_delivery_time,
    'departureAt', s.departure_at,
    'sender', jsonb_build_object('name', coalesce(s.sender ->> 'name', ''), 'address', coalesce(s.sender ->> 'address', ''),
                               'phone', coalesce(s.sender ->> 'phone', ''), 'email', coalesce(s.sender ->> 'email', '')),
    'receiver', jsonb_build_object('name', coalesce(s.receiver ->> 'name', ''), 'address', coalesce(s.receiver ->> 'address', ''),
                                 'phone', coalesce(s.receiver ->> 'phone', ''), 'email', coalesce(s.receiver ->> 'email', '')),
    'receiverName', coalesce(s.receiver ->> 'name', ''),
    'createdAt', s.created_at,
    'updatedAt', s.updated_at,
    'serverNow', now(),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'date', e.date, 'status', e.status, 'location', e.location, 'note', e.note,
                                          'hasPhoto', exists (select 1 from public.event_photos p where p.event_id = e.id))
                       order by e.date desc, e.created_at desc)
      from public.shipment_events e where e.shipment_id = s.id
    ), '[]'::jsonb)
  )
  from public.shipments s
  where s.tracking_number = upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
$$;
