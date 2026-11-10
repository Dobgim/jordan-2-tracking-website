-- The tracking page now builds a downloadable shipment invoice, so the public
-- lookup also returns the invoice number, dates and the sender/receiver names
-- and addresses (still no phone numbers or emails).
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
    'sender', jsonb_build_object('name', coalesce(s.sender ->> 'name', ''), 'address', coalesce(s.sender ->> 'address', '')),
    'receiver', jsonb_build_object('name', coalesce(s.receiver ->> 'name', ''), 'address', coalesce(s.receiver ->> 'address', '')),
    'receiverName', coalesce(s.receiver ->> 'name', ''),
    'createdAt', s.created_at,
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

-- Company details printed on the invoice.
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
    'companyEmail', company_email,
    'companyAddress', company_address,
    'companyWebsite', company_website,
    'invoiceTerms', invoice_terms
  )
  from public.settings where id = 1;
$$;
