-- M-002C2A: transaction-safe binding of a *pre-created* Supabase Auth user.
-- This migration cannot create an Auth user and does not provision accounts.
-- Never grant these RPCs to anon/authenticated; BFF must verify session first.
create function public.pg_m002c2_attach_account(
 p_actor_id uuid,p_new_auth_user_id uuid,p_username text,p_auth_alias text,
 p_display_name text,p_role public.app_role,p_idempotency_key uuid,p_request_id text
) returns jsonb language plpgsql volatile security definer set search_path=''
as $fn$
declare
 v_username text:=pg_catalog.lower(pg_catalog.btrim(p_username));
 v_alias text:=pg_catalog.lower(pg_catalog.btrim(p_auth_alias));
 v_name text:=pg_catalog.btrim(p_display_name);
 v_payload jsonb;
 v_saved private.master_idempotency%rowtype;
 v_result jsonb;
begin
 if not exists (
  select 1 from public.accounts a
  join public.account_roles r on r.account_id=a.auth_user_id
  where a.auth_user_id=p_actor_id and a.active
    and not a.must_change_password and r.role='admin'
 ) then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 -- Admin role must never be silently granted through ordinary provisioning.
 if p_role is null or p_role not in ('teacher','counselor','principal')
  or p_new_auth_user_id is null or p_new_auth_user_id=p_actor_id
  or v_username is null or v_username !~ '^[a-z0-9._-]{3,32}$'
  or v_username in ('root','system','adminroot')
  or v_alias is null or pg_catalog.length(v_alias)>254
  or v_alias !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  or v_name is null or pg_catalog.length(v_name) not between 1 and 120
  or p_idempotency_key is null or p_request_id is null
  or pg_catalog.length(p_request_id) not between 1 and 100
 then raise exception 'INVALID_PROVISION_INPUT' using errcode='22023'; end if;
 -- Only Auth identities minted by the PortalGenius server-side admin API can
 -- be linked. This excludes self-signup identities even if Auth signup is on.
 if not exists(
  select 1 from auth.users u where u.id=p_new_auth_user_id
    and pg_catalog.lower(u.email)=v_alias and u.email_confirmed_at is not null
    and u.raw_app_meta_data->>'managed_by'='portalgenius'
 ) then raise exception 'AUTH_IDENTITY_NOT_MANAGED' using errcode='42501'; end if;

 v_payload:=pg_catalog.jsonb_build_object(
  'userId',p_new_auth_user_id,'username',v_username,'alias',v_alias,
  'displayName',v_name,'role',p_role
 );
 perform pg_catalog.pg_advisory_xact_lock(20261015,2201);
 select * into v_saved from private.master_idempotency where
  actor_id=p_actor_id and operation='account.provision'
  and request_key=p_idempotency_key;
 if found then
  if v_saved.payload<>v_payload then
   raise exception 'IDEMPOTENCY_CONFLICT' using errcode='23505'; end if;
  return v_saved.result;
 end if;
 if exists(select 1 from public.accounts where auth_user_id=p_new_auth_user_id)
  or exists(select 1 from private.login_identities where username_normalized=v_username)
 then raise exception 'ACCOUNT_ALREADY_EXISTS' using errcode='23505'; end if;

 insert into public.accounts(auth_user_id,display_name,active,must_change_password)
 values(p_new_auth_user_id,v_name,true,true);
 insert into private.login_identities(auth_user_id,username_normalized,auth_alias,provisioning_state)
 values(p_new_auth_user_id,v_username,v_alias,'ready');
 insert into public.account_roles(account_id,role) values(p_new_auth_user_id,p_role);
 v_result:=pg_catalog.jsonb_build_object(
  'id',p_new_auth_user_id,'username',v_username,'displayName',v_name,
  'role',p_role,'active',true,'mustChangePassword',true
 );
 insert into private.master_idempotency(actor_id,operation,request_key,payload,result)
 values(p_actor_id,'account.provision',p_idempotency_key,v_payload,v_result);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,changed_fields,request_id)
 values(p_actor_id,'account.provision','account',p_new_auth_user_id,
  array['username','display_name','role','active','must_change_password'],p_request_id);
 return v_result;
end;
$fn$;

create function public.pg_m002c2_provision_result(p_actor_id uuid,p_idempotency_key uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare v_result jsonb;
begin
 if not exists(select 1 from public.accounts a
  join public.account_roles r on r.account_id=a.auth_user_id
  where a.auth_user_id=p_actor_id and a.active and not a.must_change_password
   and r.role='admin')
 then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 if p_idempotency_key is null then
  raise exception 'INVALID_IDEMPOTENCY_KEY' using errcode='22023'; end if;
 select r.result into v_result from private.master_idempotency r
 where r.actor_id=p_actor_id and r.operation='account.provision'
 and r.request_key=p_idempotency_key;
 return v_result;
end;
$fn$;

revoke all on function
 public.pg_m002c2_attach_account(uuid,uuid,text,text,text,public.app_role,uuid,text),
 public.pg_m002c2_provision_result(uuid,uuid)
from public,anon,authenticated;
grant execute on function
 public.pg_m002c2_attach_account(uuid,uuid,text,text,text,public.app_role,uuid,text),
 public.pg_m002c2_provision_result(uuid,uuid)
to service_role;
