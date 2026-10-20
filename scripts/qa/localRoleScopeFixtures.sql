-- M-002C2D LOCAL QA ONLY: scoped synthetic school projections.
-- Never copy into supabase/migrations or apply to a hosted project.
create function public.pg_qa_seed_role_scopes(
 p_teacher_a uuid,p_teacher_b uuid,p_counselor_a uuid,p_counselor_b uuid
) returns jsonb language plpgsql volatile security definer set search_path='' as $qa$
declare
 v_year uuid;v_term uuid;v_subject uuid;
 v_ta uuid;v_tb uuid;v_active_a uuid;v_active_b uuid;v_expired uuid;
 v_s1 uuid;v_s2 uuid;v_s3 uuid;v_s4 uuid;v_s5 uuid;v_s6 uuid;v_s7 uuid;
begin
 if p_teacher_a is null or p_teacher_b is null
    or p_counselor_a is null or p_counselor_b is null
    or (select count(distinct id) from
        (values(p_teacher_a),(p_teacher_b),(p_counselor_a),(p_counselor_b)) as q(id))<>4
    or exists(select 1 from public.students)
    or exists(select 1 from public.teachers)
    or exists(select 1 from public.academic_years)
 then raise exception 'LOCAL_QA_SEED_NOT_EMPTY_OR_INVALID' using errcode='42501';end if;
 if not exists(select 1 from public.account_roles
    where account_id=p_teacher_a and role='teacher')
 or not exists(select 1 from public.account_roles
    where account_id=p_teacher_b and role='teacher')
 or not exists(select 1 from public.account_roles
    where account_id=p_counselor_a and role='counselor')
 or not exists(select 1 from public.account_roles
    where account_id=p_counselor_b and role='counselor')
 then raise exception 'LOCAL_QA_ROLE_BINDINGS_MISSING' using errcode='42501';end if;
 insert into public.academic_years(label,start_date,end_date)
 values('QA Synthetic 2020-2099','2020-01-01','2099-12-31') returning id into v_year;
 insert into public.terms(year_id,name,start_date,end_date)
 values(v_year,'QA Term','2020-01-01','2099-12-31') returning id into v_term;
 insert into public.subjects(code,name) values('QA_SUBJECT','QA Synthetic Subject') returning id into v_subject;
 insert into public.teachers(account_id,code)values(p_teacher_a,'QA_TEACHER_A') returning id into v_ta;
 insert into public.teachers(account_id,code)values(p_teacher_b,'QA_TEACHER_B') returning id into v_tb;
 insert into public.students(nis,full_name)values('QA_001','QA Shared Visible') returning id into v_s1;
 insert into public.students(nis,full_name)values('QA_002','QA Teacher A Visible') returning id into v_s2;
 insert into public.students(nis,full_name)values('QA_003','QA Teacher B Visible') returning id into v_s3;
 insert into public.students(nis,full_name)values('QA_004','QA Counselor B Visible') returning id into v_s4;
 insert into public.students(nis,full_name)values('QA_005','QA Expired Assignment') returning id into v_s5;
 insert into public.students(nis,full_name,archived_at)
 values('QA_006','QA Archived Student',now()) returning id into v_s6;
 insert into public.students(nis,full_name)values('QA_007','QA Unassigned Student') returning id into v_s7;
 insert into public.teaching_assignments(teacher_id,subject_id,term_id,valid_from,valid_to)
 values(v_ta,v_subject,v_term,'2020-01-01','2099-12-31') returning id into v_active_a;
 insert into public.teaching_assignments(teacher_id,subject_id,term_id,valid_from,valid_to)
 values(v_tb,v_subject,v_term,'2020-01-01','2099-12-31') returning id into v_active_b;
 insert into public.teaching_assignments(teacher_id,subject_id,term_id,valid_from,valid_to)
 values(v_ta,v_subject,v_term,'2010-01-01','2011-12-31') returning id into v_expired;
 insert into public.assignment_students(assignment_id,student_id,valid_from,valid_to)
 values(v_active_a,v_s1,'2020-01-01','2099-12-31'),
       (v_active_a,v_s2,'2020-01-01','2099-12-31'),
       (v_active_a,v_s6,'2020-01-01','2099-12-31'),
       (v_active_b,v_s3,'2020-01-01','2099-12-31'),
       (v_expired,v_s5,'2010-01-01','2011-12-31');
 insert into public.counselor_assignments(account_id,student_id,valid_from,valid_to)
 values(p_counselor_a,v_s1,'2020-01-01','2099-12-31'),
       (p_counselor_a,v_s5,'2010-01-01','2011-12-31'),
       (p_counselor_b,v_s4,'2020-01-01','2099-12-31');
 return pg_catalog.jsonb_build_object('s1',v_s1,'s2',v_s2,'s3',v_s3,
    's4',v_s4,'s5',v_s5,'s6',v_s6,'s7',v_s7);
end;
$qa$;

create function public.pg_qa_clear_role_scopes()
returns boolean language plpgsql volatile security definer set search_path='' as $qa$
declare
 v_step text:='FIXTURE_GUARD';
 v_code text;
 v_link record;
 v_id uuid;
begin
 -- This RPC exists only inside a newly created local Docker project.
 -- Fail closed if any row does not match our synthetic fixture markers.
 if exists(select 1 from public.students where pg_catalog.left(nis,3)<>'QA_')
    or exists(select 1 from public.teachers where pg_catalog.left(code,3)<>'QA_')
    or exists(select 1 from public.academic_years
              where pg_catalog.left(label,13)<>'QA Synthetic ')
    or exists(select 1 from public.subjects where pg_catalog.left(code,3)<>'QA_')
    or exists(select 1 from public.terms where name<>'QA Term')
 then raise exception 'LOCAL_QA_REFUSE_NON_FIXTURE_DATA' using errcode='42501';end if;
 -- This is a tiny, local-only fixture. Delete by complete primary key,
 -- one row per statement, to avoid multirow cardinality interactions.
 -- SQL remains atomic: any failure rolls back this entire RPC.
 v_step:='ASSIGNMENT_STUDENTS';
 for v_link in
  select assignment_id,student_id,valid_from
  from public.assignment_students
  order by assignment_id,student_id,valid_from
 loop
  v_step:='ASSIGNMENT_STUDENTS_ROW';
  delete from public.assignment_students
   where assignment_id=v_link.assignment_id
     and student_id=v_link.student_id and valid_from=v_link.valid_from;
  if not found then raise exception 'LOCAL_QA_ROW_MISSING' using errcode='22000'; end if;
 end loop;
 v_step:='COUNSELOR_ASSIGNMENTS';
 for v_id in select id from public.counselor_assignments order by id loop
  v_step:='COUNSELOR_ASSIGNMENTS_ROW';
  delete from public.counselor_assignments where id=v_id;
  if not found then raise exception 'LOCAL_QA_ROW_MISSING' using errcode='22000'; end if;
 end loop;
 v_step:='TEACHING_ASSIGNMENTS';
 for v_id in select id from public.teaching_assignments order by id loop
  v_step:='TEACHING_ASSIGNMENTS_ROW';
  delete from public.teaching_assignments where id=v_id;
  if not found then raise exception 'LOCAL_QA_ROW_MISSING' using errcode='22000'; end if;
 end loop;
 v_step:='STUDENTS';
 for v_id in select id from public.students
  where pg_catalog.left(nis,3)='QA_' order by id loop
  v_step:='STUDENTS_ROW';
  delete from public.students where id=v_id;
  if not found then raise exception 'LOCAL_QA_ROW_MISSING' using errcode='22000'; end if;
 end loop;
 v_step:='TEACHERS';
 for v_id in select id from public.teachers
  where pg_catalog.left(code,3)='QA_' order by id loop
  v_step:='TEACHERS_ROW';
  delete from public.teachers where id=v_id;
  if not found then raise exception 'LOCAL_QA_ROW_MISSING' using errcode='22000'; end if;
 end loop;
 v_step:='TERMS';
 for v_id in select id from public.terms where name='QA Term' order by id loop
  v_step:='TERMS_ROW';
  delete from public.terms where id=v_id;
  if not found then raise exception 'LOCAL_QA_ROW_MISSING' using errcode='22000'; end if;
 end loop;
 v_step:='SUBJECTS';
 for v_id in select id from public.subjects
  where pg_catalog.left(code,3)='QA_' order by id loop
  v_step:='SUBJECTS_ROW';
  delete from public.subjects where id=v_id;
  if not found then raise exception 'LOCAL_QA_ROW_MISSING' using errcode='22000'; end if;
 end loop;
 v_step:='ACADEMIC_YEARS';
 for v_id in select id from public.academic_years
  where pg_catalog.left(label,13)='QA Synthetic ' order by id loop
  v_step:='ACADEMIC_YEARS_ROW';
  delete from public.academic_years where id=v_id;
  if not found then raise exception 'LOCAL_QA_ROW_MISSING' using errcode='22000'; end if;
 end loop;
 v_step:='VERIFY_EMPTY';
 return not exists(select 1 from public.students)
    and not exists(select 1 from public.teachers)
    and not exists(select 1 from public.teaching_assignments)
    and not exists(select 1 from public.counselor_assignments)
    and not exists(select 1 from public.assignment_students)
    and not exists(select 1 from public.terms)
    and not exists(select 1 from public.subjects)
    and not exists(select 1 from public.academic_years);
exception when others then
 -- Atomic rollback for this RPC: never partially report cleared fixtures.
 -- Only reveal a fixed stage label and SQLSTATE; not provider detail or data.
 get stacked diagnostics v_code = returned_sqlstate;
 raise exception 'LOCAL_ROLE_QA_STAGE_%_SQLSTATE_%',v_step,v_code
  using errcode='P0001';
end;
$qa$;

revoke all on function
 public.pg_qa_seed_role_scopes(uuid,uuid,uuid,uuid),
 public.pg_qa_clear_role_scopes()
 from public,anon,authenticated;
grant execute on function
 public.pg_qa_seed_role_scopes(uuid,uuid,uuid,uuid),
 public.pg_qa_clear_role_scopes()
 to service_role;
