-- M-002B: create term in selected academic year with a strict non-overlap gate.
create function public.pg_m002_create_term(
 p_actor_id uuid,p_year_id uuid,p_name text,p_start_date date,p_end_date date,
 p_idempotency_key uuid,p_request_id text
) returns jsonb language plpgsql volatile security definer set search_path=''
as $fn$
declare
 v_year public.academic_years%rowtype;
 v_term public.terms%rowtype;
 v_saved private.master_idempotency%rowtype;
 v_payload jsonb;
 v_result jsonb;
 v_name text:=pg_catalog.btrim(p_name);
begin
 if not exists (select 1 from public.accounts a
   join public.account_roles r on r.account_id=a.auth_user_id
   where a.auth_user_id=p_actor_id and a.active and not a.must_change_password and r.role='admin')
 then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 if p_year_id is null or p_idempotency_key is null or p_request_id is null
   or pg_catalog.char_length(p_request_id) not between 1 and 100
   or v_name is null or pg_catalog.char_length(v_name) not between 1 and 40
   or p_start_date is null or p_end_date is null or p_start_date>p_end_date
 then raise exception 'INVALID_TERM' using errcode='22023'; end if;
 v_payload:=pg_catalog.jsonb_build_object('yearId',p_year_id,'name',v_name,
   'startDate',p_start_date,'endDate',p_end_date);
 perform pg_catalog.pg_advisory_xact_lock(20261015,2003);
 select * into v_saved from private.master_idempotency
  where actor_id=p_actor_id and operation='term.create' and request_key=p_idempotency_key;
 if found then
   if v_saved.payload<>v_payload then
     raise exception 'IDEMPOTENCY_CONFLICT' using errcode='23505'; end if;
   return v_saved.result;
 end if;
 select * into v_year from public.academic_years where id=p_year_id;
 if not found then raise exception 'YEAR_NOT_FOUND' using errcode='23503'; end if;
 if p_start_date<v_year.start_date or p_end_date>v_year.end_date then
   raise exception 'TERM_OUTSIDE_YEAR' using errcode='22023'; end if;
 if exists(select 1 from public.terms t where t.year_id=p_year_id
    and pg_catalog.daterange(t.start_date,t.end_date,'[]') &&
        pg_catalog.daterange(p_start_date,p_end_date,'[]'))
 then raise exception 'TERM_OVERLAP' using errcode='23505'; end if;
 insert into public.terms(year_id,name,start_date,end_date)
  values(p_year_id,v_name,p_start_date,p_end_date) returning * into v_term;
 v_result:=pg_catalog.jsonb_build_object('id',v_term.id,'yearId',v_term.year_id,
   'name',v_term.name,'startDate',v_term.start_date,'endDate',v_term.end_date,
   'locked',v_term.locked,'version',v_term.version);
 insert into private.master_idempotency(actor_id,operation,request_key,payload,result)
  values(p_actor_id,'term.create',p_idempotency_key,v_payload,v_result);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,changed_fields,request_id)
  values(p_actor_id,'term.create','term',v_term.id,
     array['year_id','name','start_date','end_date'],p_request_id);
 return v_result;
end;
$fn$;
revoke all on function public.pg_m002_create_term(uuid,uuid,text,date,date,uuid,text)
 from public,anon,authenticated;
grant execute on function public.pg_m002_create_term(uuid,uuid,text,date,date,uuid,text)
 to service_role;
