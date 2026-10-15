-- M-002C1: transaction-only synthetic fixture. Rolls back ALL auth and student rows.
-- Do not run with real student data or with a live teacher account.
begin;
do $qa$
declare
 admin_id uuid;
 teacher_a uuid:=gen_random_uuid();
 teacher_b uuid:=gen_random_uuid();
 counselor_a uuid:=gen_random_uuid();
 counselor_b uuid:=gen_random_uuid();
 principal_a uuid:=gen_random_uuid();
 ta_id uuid:=gen_random_uuid();
 tb_id uuid:=gen_random_uuid();
 sa uuid:=gen_random_uuid();
 sb uuid:=gen_random_uuid();
 sc uuid:=gen_random_uuid();
 y uuid:=gen_random_uuid();
 term uuid:=gen_random_uuid();
 class_id uuid:=gen_random_uuid();
 program_id uuid:=gen_random_uuid();
 subject_id uuid:=gen_random_uuid();
 assign_a uuid:=gen_random_uuid();
 assign_b uuid:=gen_random_uuid();
 asof date:='2026-09-01'::date;
 result jsonb;
begin
 select a.auth_user_id into admin_id
 from public.accounts a join public.account_roles r on r.account_id=a.auth_user_id
 where r.role='admin' and a.active and not a.must_change_password limit 1;
 if admin_id is null then raise exception 'NO_ADMIN_FIXTURE_ANCHOR'; end if;

 insert into auth.users(id,aud,role)
 select id,'authenticated','authenticated' from
 (values(teacher_a),(teacher_b),(counselor_a),(counselor_b),(principal_a)) v(id);
 insert into public.accounts(auth_user_id,display_name,active,must_change_password)
 select id,'Synthetic rollback only',true,false from
 (values(teacher_a),(teacher_b),(counselor_a),(counselor_b),(principal_a)) v(id);
 insert into public.account_roles(account_id,role)
 values (teacher_a,'teacher'),(teacher_b,'teacher'),
        (counselor_a,'counselor'),(counselor_b,'counselor'),(principal_a,'principal');

 insert into public.academic_years(id,label,start_date,end_date)
 values(y,'QA-only-year','2026-07-01','2027-06-30');
 insert into public.terms(id,year_id,name,start_date,end_date)
 values(term,y,'QA term','2026-07-01','2026-12-31');
 insert into public.classes(id,year_id,level,grade,name)
 values(class_id,y,'smp',9,'IX QA');
 insert into public.programs(id,code,name)values(program_id,'QA_REG','QA Program');
 insert into public.subjects(id,code,name)values(subject_id,'QA_MAPEL','QA Subject');

 insert into public.teachers(id,account_id,code)
 values(ta_id,teacher_a,'QA_TEACHER_A'),(tb_id,teacher_b,'QA_TEACHER_B');
 insert into public.students(id,nis,full_name,birth_date)
 values(sa,'QA_NIS_A','QA Student A','2011-01-01'),
       (sb,'QA_NIS_B','QA Student B','2011-02-01'),
       (sc,'QA_NIS_C','QA Student C','2011-03-01');
 insert into public.student_guardians(student_id,full_name,phone,is_primary)
 values(sa,'QA PRIVATE guardian','000000000',true);
 insert into public.enrollments(student_id,class_id,program_id,start_date)
 values(sa,class_id,program_id,'2026-07-01'),(sb,class_id,program_id,'2026-07-01');
 insert into public.teaching_assignments(id,teacher_id,subject_id,term_id,valid_from,valid_to)
 values(assign_a,ta_id,subject_id,term,'2026-07-01','2026-12-31'),
       (assign_b,tb_id,subject_id,term,'2026-07-01','2026-12-31');
 insert into public.assignment_students(assignment_id,student_id,valid_from,valid_to)
 values(assign_a,sa,'2026-07-01','2026-12-31'),
       (assign_b,sb,'2026-07-01','2026-12-31');
 insert into public.counselor_assignments(account_id,student_id,valid_from,valid_to)
 values(counselor_a,sb,'2026-07-01','2026-12-31'),
       (counselor_b,sa,'2026-07-01','2026-08-15');

 if jsonb_array_length(public.pg_m002c_list_accounts(admin_id))<>6 then
  raise exception 'ADMIN_ACCOUNT_LIST_INCOMPLETE'; end if;
 if jsonb_array_length(public.pg_m002c_list_teachers(admin_id))<>2 then
  raise exception 'ADMIN_TEACHER_LIST_INCOMPLETE'; end if;
 if jsonb_array_length(public.pg_m002c_list_assignments(admin_id))<>2 then
  raise exception 'ADMIN_ASSIGNMENT_LIST_INCOMPLETE'; end if;
 if position('@' in public.pg_m002c_list_accounts(admin_id)::text)>0 then
  raise exception 'AUTH_EMAIL_ALIAS_EXPOSED'; end if;
 begin
  perform public.pg_m002c_list_accounts(teacher_a);
  raise exception 'TEACHER_CAN_LIST_ALL_ACCOUNTS';
 exception when insufficient_privilege then null;
 end;
 begin
  perform public.pg_m002c_list_assignments(principal_a);
  raise exception 'PRINCIPAL_CAN_LIST_RAW_ASSIGNMENTS';
 exception when insufficient_privilege then null;
 end;

 result:=public.pg_m002c_visible_students(admin_id,asof);
 if jsonb_array_length(result)<>3 then raise exception 'ADMIN_SCOPE_INCORRECT';end if;

 result:=public.pg_m002c_visible_students(teacher_a,asof);
 if jsonb_array_length(result)<>1 or result->0->>'id'<>sa::text
 then raise exception 'TEACHER_A_CROSS_TENANT_READ'; end if;
 if (result->0 ? 'birthDate') or (result->0 ? 'phone') or
    (result->0 ? 'guardian') or (result->0 ? 'birth_date')
 then raise exception 'TEACHER_PII_EXPOSED';end if;

 result:=public.pg_m002c_visible_students(teacher_b,asof);
 if jsonb_array_length(result)<>1 or result->0->>'id'<>sb::text
 then raise exception 'TEACHER_B_CROSS_TENANT_READ';end if;

 result:=public.pg_m002c_visible_students(counselor_a,asof);
 if jsonb_array_length(result)<>1 or result->0->>'id'<>sb::text
 then raise exception 'COUNSELOR_A_CROSS_TENANT_READ';end if;
 if public.pg_m002c_visible_students(counselor_b,asof)<>'[]'::jsonb then
 raise exception 'EXPIRED_COUNSELOR_ASSIGNMENT_VISIBLE';end if;
 if public.pg_m002c_visible_students(principal_a,asof)<>'[]'::jsonb then
 raise exception 'PRINCIPAL_UNSCOPED_RAW_READ';end if;
 if public.pg_m002c_visible_students(gen_random_uuid(),asof)<>'[]'::jsonb then
 raise exception 'UNKNOWN_ACTOR_READ';end if;
 if public.pg_m002c_visible_students(teacher_a,'2027-01-01')<>'[]'::jsonb then
 raise exception 'EXPIRED_TEACHING_ASSIGNMENT_VISIBLE';end if;

 update public.teachers set archived_at=now() where id=ta_id;
 if public.pg_m002c_visible_students(teacher_a,asof)<>'[]'::jsonb then
 raise exception 'ARCHIVED_TEACHER_READ';end if;

 if has_table_privilege('anon','public.students','select') or
    has_table_privilege('authenticated','public.students','select') or
    has_table_privilege('authenticated','public.student_guardians','select') or
    has_table_privilege('authenticated','public.assignment_students','select') or
    has_function_privilege('anon','public.pg_m002c_visible_students(uuid,date)','execute') or
    has_function_privilege('authenticated','public.pg_m002c_visible_students(uuid,date)','execute')
 then raise exception 'CLIENT_DIRECT_ACCESS_OPEN';end if;

 raise notice 'M002C_NEGATIVE_ROLE_SCOPE_PASS';
end $qa$;
rollback;
select (select count(*) from public.students) as remaining_students,
 (select count(*) from public.teachers) as remaining_teachers,
 (select count(*) from public.student_guardians) as remaining_guardians,
 (select count(*) from public.assignment_students) as remaining_assignment_students,
 (select count(*) from public.account_roles) as remaining_roles;
