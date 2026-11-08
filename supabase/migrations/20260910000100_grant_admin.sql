-- Lets an existing admin give admin access to another Supabase Auth user by email.
-- (Create the user first in Supabase: Authentication -> Users -> Add user.)
create or replace function public.grant_admin(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id uuid;
  v_email text;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can add administrators.' using errcode = '42501';
  end if;
  select id, email into v_id, v_email
  from auth.users
  where lower(email) = lower(btrim(coalesce(p_email, '')))
  limit 1;
  if v_id is null then
    raise exception 'There is no user with that email yet. Create it first in Supabase under Authentication, Users, Add user.'
      using errcode = '22023';
  end if;
  insert into public.admins (user_id, email) values (v_id, v_email) on conflict (user_id) do nothing;
  return jsonb_build_object('user_id', v_id, 'email', v_email);
end;
$$;

revoke execute on function public.grant_admin(text) from public, anon;
grant execute on function public.grant_admin(text) to authenticated;
