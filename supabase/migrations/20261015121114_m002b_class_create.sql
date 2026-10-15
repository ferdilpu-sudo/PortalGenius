-- M-002B: class creation with level/grade and academic-year checks.
create function public.pg_m002_create_class(
 p_actor_id uuid,p_year_id uuid,p_level public.school_level,p_grade integer,
 p_name text,p_idempotency_key uuid,p_request_id text
) returns jsonb language plpgsql volatile security definer set search_path=''
as $fn$
declare
 v_class public.classes%rowtype;
 v_saved private.master_idempotency%rowtype;
 v_name text:=pg_catalog.btrim(p_name);
 v_payload jsonb;
 v_result jsonb;
begin
 if not exists (select 1 from public.accounts a
   join public.account_roles r on r.account_id=a.auth_user_id
   where a.auth_user_id=p_actor_id and a.active and not a.must_change_password and r.role='admin')
 then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 if p_year_id is null or p_level is null or p_grade is null
   or not ((p_level='sd' and p_grade between 1 and 6)
     or (p_level='smp' and p_grade between 7 and 9)
     or (p_level='sma' and p_grade between 10 and 12))
   or v_name is null or pg_catalog.char_length(v_name) not between 1 and 80
   or p_idempotency_key is null or p_request_id is null
   or pg_catalog.char_length(p_request_id) not between 1 and 100
 then raise exception 'INVALID_CLASS' using errcode='22023'; end if;
 v_payload:=pg_catalog.jsonb_build_object('yearId',p_year_id,
  'level',p_level,'grade',p_grade,'name',v_name);
 perform pg_catalog.pg_advisory_xact_lock(20261015,2005);
 select * into v_saved from private.master_idempotency
  where actor_id=p_actor_id and operation='class.create' and request_key=p_idempotency_key;
 if found then
  if v_saved.payload<>v_payload then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='23505'; end if;
  return v_saved.result;
 end if;
 if not exists(select 1 from public.academic_years where id=p_year_id) then
  raise exception 'YEAR_NOT_FOUND' using errcode='23503'; end if;
 -- Reject duplicates even if casing differs: never infer identity from UI.
 if exists(select 1 from public.classes c where c.year_id=p_year_id
   and c.level=p_level and c.grade=p_grade
   and pg_catalog.lower(c.name)=pg_catalog.lower(v_name)) then
  raise exception 'CLASS_ALREADY_EXISTS' using errcode='23505'; end if;
 insert into public.classes(year_id,level,grade,name)
  values(p_year_id,p_level,p_grade,v_name) returning * into v_class;
 v_result:=pg_catalog.jsonb_build_object('id',v_class.id,'yearId',v_class.year_id,
   'level',v_class.level,'grade',v_class.grade,'name',v_class.name,
   'archivedAt',null,'version',v_class.version);
 insert into private.master_idempotency(actor_id,operation,request_key,payload,result)
  values(p_actor_id,'class.create',p_idempotency_key,v_payload,v_result);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,changed_fields,request_id)
  values(p_actor_id,'class.create','class',v_class.id,
   array['year_id','level','grade','name'],p_request_id);
 return v_result;
end;
$fn$;
revoke all on function public.pg_m002_create_class(uuid,uuid,public.school_level,integer,text,uuid,text)
 from public,anon,authenticated;
grant execute on function public.pg_m002_create_class(uuid,uuid,public.school_level,integer,text,uuid,text)
 to service_role;
