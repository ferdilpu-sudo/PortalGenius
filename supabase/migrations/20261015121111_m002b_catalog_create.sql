-- M-002B: controlled creation of program and subject catalog entries.
-- Catalog kind is strict allowlist; no dynamic SQL or user-selected table name.
create function public.pg_m002_create_catalog_entry(
 p_actor_id uuid,p_kind text,p_code text,p_name text,
 p_idempotency_key uuid,p_request_id text
) returns jsonb language plpgsql volatile security definer set search_path=''
as $fn$
declare
 v_code text:=pg_catalog.upper(pg_catalog.btrim(p_code));
 v_name text:=pg_catalog.btrim(p_name);
 v_payload jsonb;
 v_saved private.master_idempotency%rowtype;
 v_id uuid;
 v_result jsonb;
 v_action text;
begin
 if not exists (select 1 from public.accounts a
   join public.account_roles r on r.account_id=a.auth_user_id
   where a.auth_user_id=p_actor_id and a.active and not a.must_change_password and r.role='admin')
 then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 if p_kind is null or p_kind not in ('program','subject')
   or v_code is null or v_code !~ '^[A-Z0-9_-]{2,32}$'
   or v_name is null or pg_catalog.char_length(v_name) not between 1 and 120
   or p_idempotency_key is null or p_request_id is null
   or pg_catalog.char_length(p_request_id) not between 1 and 100
 then raise exception 'INVALID_CATALOG' using errcode='22023'; end if;
 v_action:='catalog.'||p_kind||'.create';
 v_payload:=pg_catalog.jsonb_build_object('kind',p_kind,'code',v_code,'name',v_name);
 perform pg_catalog.pg_advisory_xact_lock(20261015,2004);
 select * into v_saved from private.master_idempotency
  where actor_id=p_actor_id and operation=v_action and request_key=p_idempotency_key;
 if found then
  if v_saved.payload<>v_payload then
   raise exception 'IDEMPOTENCY_CONFLICT' using errcode='23505'; end if;
  return v_saved.result;
 end if;
 if p_kind='program' then
  insert into public.programs(code,name) values(v_code,v_name) returning id into v_id;
 else
  insert into public.subjects(code,name) values(v_code,v_name) returning id into v_id;
 end if;
 v_result:=pg_catalog.jsonb_build_object('id',v_id,'code',v_code,'name',v_name,
  'archivedAt',null,'version',1);
 insert into private.master_idempotency(actor_id,operation,request_key,payload,result)
  values(p_actor_id,v_action,p_idempotency_key,v_payload,v_result);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,changed_fields,request_id)
  values(p_actor_id,v_action,p_kind,v_id,array['code','name'],p_request_id);
 return v_result;
end;
$fn$;
revoke all on function public.pg_m002_create_catalog_entry(uuid,text,text,text,uuid,text)
 from public,anon,authenticated;
grant execute on function public.pg_m002_create_catalog_entry(uuid,text,text,text,uuid,text)
 to service_role;
