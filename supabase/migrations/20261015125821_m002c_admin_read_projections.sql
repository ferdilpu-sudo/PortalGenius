-- M-002C admin-only read projections; private auth aliases are never returned.
create function public.pg_m002c_list_accounts(p_actor_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare v_result jsonb;
begin
 if not exists(select 1 from public.accounts a join public.account_roles r on r.account_id=a.auth_user_id
  where a.auth_user_id=p_actor_id and a.active and not a.must_change_password and r.role='admin')
 then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'id',x.id,'username',x.username,'displayName',x.display_name,
   'active',x.active,'mustChangePassword',x.must_change_password,
   'roles',x.roles) order by x.display_name,x.id),'[]'::jsonb) into v_result
 from (
  select a.auth_user_id as id,l.username_normalized as username,a.display_name,a.active,a.must_change_password,
    coalesce((select pg_catalog.jsonb_agg(r.role order by r.role)
     from public.account_roles r where r.account_id=a.auth_user_id),'[]'::jsonb) as roles
  from public.accounts a left join private.login_identities l on l.auth_user_id=a.auth_user_id
  order by a.display_name,a.auth_user_id limit 200
 ) x;
 return v_result;
end;$fn$;

create function public.pg_m002c_list_teachers(p_actor_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare v_result jsonb;
begin
 if not exists(select 1 from public.accounts a join public.account_roles r on r.account_id=a.auth_user_id
  where a.auth_user_id=p_actor_id and a.active and not a.must_change_password and r.role='admin')
 then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'id',t.id,'code',t.code,'accountId',t.account_id,
  'displayName',a.display_name,'archivedAt',t.archived_at,'version',t.version
 ) order by t.code,t.id),'[]'::jsonb) into v_result
 from (select * from public.teachers order by code,id limit 200) t
 left join public.accounts a on a.auth_user_id=t.account_id;
 return v_result;
end;$fn$;

create function public.pg_m002c_list_assignments(p_actor_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare v_result jsonb;
begin
 if not exists(select 1 from public.accounts a join public.account_roles r on r.account_id=a.auth_user_id
  where a.auth_user_id=p_actor_id and a.active and not a.must_change_password and r.role='admin')
 then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'id',x.id,'teacherCode',x.teacher_code,'subjectName',x.subject_name,
  'termName',x.term_name,'validFrom',x.valid_from,'validTo',x.valid_to,
  'studentCount',x.student_count,'archivedAt',x.archived_at
 ) order by x.valid_from desc,x.id),'[]'::jsonb) into v_result
 from (
  select a.id,t.code as teacher_code,s.name as subject_name,term.name as term_name,
   a.valid_from,a.valid_to,a.archived_at,
   (select count(distinct ast.student_id) from public.assignment_students ast
      where ast.assignment_id=a.id) as student_count
  from public.teaching_assignments a
  join public.teachers t on t.id=a.teacher_id
  join public.subjects s on s.id=a.subject_id
  join public.terms term on term.id=a.term_id
  order by a.valid_from desc,a.id limit 200
 ) x;
 return v_result;
end;$fn$;

revoke all on function public.pg_m002c_list_accounts(uuid),
 public.pg_m002c_list_teachers(uuid),public.pg_m002c_list_assignments(uuid)
 from public,anon,authenticated;
grant execute on function public.pg_m002c_list_accounts(uuid),
 public.pg_m002c_list_teachers(uuid),public.pg_m002c_list_assignments(uuid)
 to service_role;
