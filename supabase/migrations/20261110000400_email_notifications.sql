-- Email notifications: when a shipment is created or its status changes, the
-- database calls the notify-shipment Edge Function, which emails the sender and
-- the receiver. The shared secret lives in a schema the API does not expose.
create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.app_secrets (
  name text primary key,
  value text not null
);
revoke all on private.app_secrets from public, anon, authenticated;
-- filled once at setup:
--   insert into private.app_secrets values ('notify_url', 'https://<ref>.supabase.co/functions/v1/notify-shipment'),
--                                         ('notify_secret', '<random>');

-- What was sent (shown to admins; written by the Edge Function).
create table if not exists public.email_log (
  id bigint generated always as identity primary key,
  shipment_id uuid references public.shipments (id) on delete cascade,
  recipient text not null,
  subject text not null default '',
  kind text not null default '',
  ok boolean not null default false,
  error text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists email_log_shipment_idx on public.email_log (shipment_id, created_at desc);
alter table public.email_log enable row level security;
revoke all on public.email_log from anon;
grant select, delete on public.email_log to authenticated;
drop policy if exists "admins read email log" on public.email_log;
create policy "admins read email log" on public.email_log for select to authenticated using (public.is_admin());
drop policy if exists "admins clear email log" on public.email_log;
create policy "admins clear email log" on public.email_log for delete to authenticated using (public.is_admin());

create or replace function private.notify_shipment()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_url text := (select value from private.app_secrets where name = 'notify_url');
  v_secret text := (select value from private.app_secrets where name = 'notify_secret');
begin
  if v_url is null or v_secret is null then
    return new;
  end if;
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object('type', case when tg_op = 'INSERT' then 'created' else 'status' end,
                                 'shipment_id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
      timeout_milliseconds := 30000
    );
  end if;
  return new;
end;
$$;

drop trigger if exists shipments_notify on public.shipments;
create trigger shipments_notify
  after insert or update of status on public.shipments
  for each row execute function private.notify_shipment();
