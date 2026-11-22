-- Delivery photo unlock: when the receiver has no separate "Postal code", accept
-- a postal code that appears in the delivery address (e.g. "Bündtenstrasse 16, 5013"
-- or "Stevenage, SG1 1JS"). The code must be 3+ characters and contain a digit,
-- so street words and short house numbers do not count.
create or replace function public.delivery_photo(p_code text, p_event_id uuid, p_postal text)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_id uuid;
  v_postal text;
  v_address text;
  v_tokens text[];
  v_given text := upper(regexp_replace(coalesce(p_postal, ''), '[^A-Za-z0-9]', '', 'g'));
  v_ok boolean := false;
  v_photo text;
begin
  select s.id,
         upper(regexp_replace(coalesce(s.receiver ->> 'postalCode', ''), '[^A-Za-z0-9]', '', 'g')),
         upper(coalesce(s.receiver ->> 'address', ''))
    into v_id, v_postal, v_address
  from public.shipments s
  where s.tracking_number = upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));

  if v_id is null then
    return jsonb_build_object('error', 'not_found');
  end if;

  v_tokens := array_remove(regexp_split_to_array(v_address, '[^A-Z0-9]+'), '');
  if v_postal = '' and not exists (
    select 1 from unnest(v_tokens) t where t ~ '[0-9]' and length(t) >= 3
  ) and not exists (
    select 1 from generate_subscripts(v_tokens, 1) i
    where i < array_length(v_tokens, 1) and (v_tokens[i] || v_tokens[i + 1]) ~ '[0-9]'
      and length(v_tokens[i] || v_tokens[i + 1]) between 5 and 8 and v_tokens[i] ~ '^[A-Z]{1,2}[0-9]'
  ) then
    return jsonb_build_object('error', 'no_postal');
  end if;

  if (select count(*) from private.photo_attempts where shipment_id = v_id and at > now() - interval '15 minutes') >= 8 then
    return jsonb_build_object('error', 'too_many');
  end if;

  if v_given ~ '[0-9]' and length(v_given) >= 3 then
    if v_postal <> '' then
      v_ok := v_given = v_postal;
    else
      v_ok := exists (
        select 1 from generate_subscripts(v_tokens, 1) i
        where v_tokens[i] = v_given or (v_tokens[i] || coalesce(v_tokens[i + 1], '')) = v_given
      );
    end if;
  end if;

  if not v_ok then
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
