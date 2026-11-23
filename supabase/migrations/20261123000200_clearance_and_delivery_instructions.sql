alter table public.shipments
  add column if not exists amount_due numeric(12, 2),
  add column if not exists delivery_instruction text not null default '',
  add column if not exists delivery_instruction_note text not null default '';

alter table public.shipments
  drop constraint if exists shipments_amount_due_check,
  add constraint shipments_amount_due_check check (amount_due is null or amount_due >= 0),
  drop constraint if exists shipments_delivery_instruction_check,
  add constraint shipments_delivery_instruction_check check (
    delivery_instruction in ('', 'Leave at door', 'Hand it to me', 'Leave with a neighbor', 'Leave at reception', 'Other')
  ),
  drop constraint if exists shipments_delivery_instruction_note_check,
  add constraint shipments_delivery_instruction_note_check check (
    length(delivery_instruction_note) <= 500
    and (delivery_instruction_note = '' or delivery_instruction = 'Other')
  );

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
    'amountDue', s.amount_due,
    'currency', coalesce(nullif(s.invoice ->> 'currency', ''), 'USD'),
    'deliveryInstruction', s.delivery_instruction,
    'deliveryInstructionNote', s.delivery_instruction_note,
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

create or replace function public.save_delivery_instruction(p_code text, p_instruction text, p_note text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_instruction text := btrim(coalesce(p_instruction, ''));
  v_note text := btrim(coalesce(p_note, ''));
  v_id uuid;
  v_status text;
  v_updated_at timestamptz;
begin
  if v_instruction not in ('Leave at door', 'Hand it to me', 'Leave with a neighbor', 'Leave at reception', 'Other') then
    return jsonb_build_object('error', 'invalid_instruction');
  end if;
  if length(v_note) > 500 or (v_instruction = 'Other' and v_note = '') then
    return jsonb_build_object('error', 'invalid_note');
  end if;

  select id, status into v_id, v_status
  from public.shipments
  where tracking_number = upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));

  if v_id is null then
    return jsonb_build_object('error', 'not_found');
  end if;
  if v_status in ('Delivered', 'Cancelled') then
    return jsonb_build_object('error', 'shipment_closed');
  end if;

  update public.shipments
  set delivery_instruction = v_instruction,
      delivery_instruction_note = case when v_instruction = 'Other' then v_note else '' end
  where id = v_id and status not in ('Delivered', 'Cancelled')
  returning updated_at into v_updated_at;

  if not found then
    return jsonb_build_object('error', 'shipment_closed');
  end if;
  return jsonb_build_object(
    'deliveryInstruction', v_instruction,
    'deliveryInstructionNote', case when v_instruction = 'Other' then v_note else '' end,
    'updatedAt', v_updated_at
  );
end;
$$;

revoke all on function public.save_delivery_instruction(text, text, text) from public;
grant execute on function public.save_delivery_instruction(text, text, text) to anon, authenticated;

create or replace function private.notify_shipment()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_url text := (select value from private.app_secrets where name = 'notify_url');
  v_secret text := (select value from private.app_secrets where name = 'notify_secret');
  v_type text;
begin
  if tg_op = 'INSERT' then
    v_type := 'created';
  elsif new.status is distinct from old.status then
    v_type := 'status';
  elsif (new.delivery_instruction, new.delivery_instruction_note)
        is distinct from (old.delivery_instruction, old.delivery_instruction_note) then
    v_type := 'delivery_instruction';
  else
    return new;
  end if;

  if v_url is not null and v_secret is not null then
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object('type', v_type, 'shipment_id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
      timeout_milliseconds := 30000
    );
  end if;
  return new;
end;
$$;

drop trigger if exists shipments_notify on public.shipments;
create trigger shipments_notify
  after insert or update of status, delivery_instruction, delivery_instruction_note on public.shipments
  for each row execute function private.notify_shipment();
