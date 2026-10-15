-- PortalGenius M-001: one-time initial admin provisioning.
-- The server creates its Supabase Auth user first; this RPC atomically binds identity and role.
create or replace function public.pg_auth_bootstrap_first_admin(
 p_auth_user_id uuid,
 p_username text,
 p_auth_alias text,
 p_display_name text
) returns void
language plpgsql volatile security definer
set search_path = ''
as $function$
declare
 v_username text;
 v_alias text;
begin
 -- Serialize all bootstrap attempts; the one-time condition cannot race.
 perform pg_catalog.pg_advisory_xact_lock(1061120524);
 if exists (select 1 from public.accounts) then
   raise exception 'BOOTSTRAP_CLOSED' using errcode = 'P0001';
 end if;
 v_username := pg_catalog.lower(pg_catalog.btrim(p_username));
 v_alias := pg_catalog.lower(pg_catalog.btrim(p_auth_alias));
 if v_username is null
    or v_username !~ '^[a-z0-9._-]{3,32}$'
    or v_username in ('root', 'system', 'adminroot')
    or p_display_name is null
    or pg_catalog.char_length(pg_catalog.btrim(p_display_name)) not between 1 and 120
    or v_alias is null
    or pg_catalog.char_length(v_alias) not between 6 and 254
 then
   raise exception 'BOOTSTRAP_INVALID_INPUT' using errcode = '22023';
 end if;
 if not exists (
   select 1 from auth.users u
   where u.id = p_auth_user_id
     and pg_catalog.lower(u.email) = v_alias
     and u.email_confirmed_at is not null
     and u.deleted_at is null
 ) then
   raise exception 'BOOTSTRAP_AUTH_IDENTITY_NOT_READY' using errcode = '22023';
 end if;
 insert into public.accounts (auth_user_id,display_name,active,must_change_password)
 values (p_auth_user_id,pg_catalog.btrim(p_display_name),true,true);
 insert into private.login_identities (auth_user_id,username_normalized,auth_alias,provisioning_state)
 values (p_auth_user_id,v_username,v_alias,'ready');
 insert into public.account_roles (account_id,role) values (p_auth_user_id,'admin');
 insert into public.audit_events (actor_id,action,entity_type,entity_id,changed_fields,request_id)
 values (p_auth_user_id,'bootstrap.initial_admin','account',p_auth_user_id,
          array['display_name','active','must_change_password','username','roles'],
          pg_catalog.gen_random_uuid()::text);
end;
$function$;

revoke all on function public.pg_auth_bootstrap_first_admin(uuid,text,text,text)
 from public,anon,authenticated;
grant execute on function public.pg_auth_bootstrap_first_admin(uuid,text,text,text)
 to service_role;
