-- Extra shipment details: piece type, package description, expected delivery
-- time. (Sender address lives in the existing sender jsonb.)
alter table public.shipments add column if not exists piece_type text not null default '';
alter table public.shipments add column if not exists package_description text not null default '';
alter table public.shipments add column if not exists estimated_delivery_time text not null default '';

-- Tracking lookup, now including the new details. Still no contact details.
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
    'pieceType', s.piece_type,
    'packageDescription', s.package_description,
    'estimatedDelivery', s.estimated_delivery,
    'estimatedDeliveryTime', s.estimated_delivery_time,
    'departureAt', s.departure_at,
    'receiverName', coalesce(s.receiver ->> 'name', ''),
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
