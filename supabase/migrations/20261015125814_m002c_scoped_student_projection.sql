-- M-002C1: service-role-only read projection, scoped to active assignments.
-- BFF must derive p_actor_id from a VERIFIED session; never from request payload.
create function public.pg_m002c_visible_students(p_actor_id uuid,p_on_date date)
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare
 v_admin boolean;
 v_teacher boolean;
 v_counselor boolean;
 v_result jsonb;
begin
 if p_actor_id is null or p_on_date is null then
  raise exception 'INVALID_PROJECTION_INPUT' using errcode='22023';
 end if;
 if not exists(select 1 from public.accounts a
   where a.auth_user_id=p_actor_id and a.active and not a.must_change_password)
 then return '[]'::jsonb; end if;
 select exists(select 1 from public.account_roles r where r.account_id=p_actor_id and r.role='admin'),
   exists(select 1 from public.account_roles r where r.account_id=p_actor_id and r.role='teacher'),
   exists(select 1 from public.account_roles r where r.account_id=p_actor_id and r.role='counselor')
 into v_admin,v_teacher,v_counselor;
 -- Never expose date of birth, guardians, phone numbers, private notes or
 -- any other columns through the teacher/counselor projection.
 select coalesce(pg_catalog.jsonb_agg(
  pg_catalog.jsonb_build_object('id',s.id,'nis',s.nis,'fullName',s.full_name)
  order by s.full_name,s.id
 ),'[]'::jsonb) into v_result
 from (
  select s.id,s.nis,s.full_name
  from public.students s
  where s.archived_at is null and (
   v_admin or
   (v_teacher and exists (
    select 1 from public.assignment_students ast
    join public.teaching_assignments a on a.id=ast.assignment_id
    join public.teachers t on t.id=a.teacher_id
    where t.account_id=p_actor_id and t.archived_at is null
    and a.archived_at is null and ast.student_id=s.id
    and a.valid_from<=p_on_date
    and (a.valid_to is null or a.valid_to>=p_on_date)
    and ast.valid_from<=p_on_date
    and (ast.valid_to is null or ast.valid_to>=p_on_date)
   )) or
   (v_counselor and exists(
    select 1 from public.counselor_assignments ca
    where ca.account_id=p_actor_id and ca.student_id=s.id
     and ca.valid_from<=p_on_date
     and (ca.valid_to is null or ca.valid_to>=p_on_date)
   ))
  )
  order by s.full_name,s.id limit 200
 ) s;
 return v_result;
end;
$fn$;
revoke all on function public.pg_m002c_visible_students(uuid,date)
 from public,anon,authenticated;
grant execute on function public.pg_m002c_visible_students(uuid,date)
 to service_role;
