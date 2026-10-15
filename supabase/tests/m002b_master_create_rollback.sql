-- M-002B transaction rollback QA; entirely synthetic, never persists fixtures.
begin;
do $qa$
declare
 actor uuid;
 year_obj jsonb; yr uuid;
 term_obj jsonb; program_obj jsonb; subject_obj jsonb; class_obj jsonb;
 key_term uuid:=gen_random_uuid();
 key_program uuid:=gen_random_uuid();
 key_class uuid:=gen_random_uuid();
 duplicate_term boolean:=false;
 outside_year boolean:=false;
 catalog_conflict boolean:=false;
 class_conflict boolean:=false;
 grade_blocked boolean:=false;
 bad_actor boolean:=false;
begin
 select auth_user_id into actor from public.accounts where active limit 1;
 if actor is null then raise exception 'QA_NO_ADMIN'; end if;
 year_obj:=public.pg_m002_create_academic_year(actor,'QA-Year-2098',
  '2098-01-01'::date,'2098-12-31'::date,gen_random_uuid(),'QA-M2B-year');
 yr:=(year_obj->>'id')::uuid;
 term_obj:=public.pg_m002_create_term(actor,yr,'QA Ganjil','2098-01-01'::date,
  '2098-06-30'::date,key_term,'QA-M2B-term');
 if term_obj<>public.pg_m002_create_term(actor,yr,'QA Ganjil','2098-01-01'::date,
  '2098-06-30'::date,key_term,'QA-M2B-term-retry')
 then raise exception 'QA_TERM_RETRY_CHANGED'; end if;
 begin
  perform public.pg_m002_create_term(actor,yr,'QA bentrok','2098-06-01'::date,
   '2098-12-31'::date,gen_random_uuid(),'QA-M2B-term-overlap');
 exception when unique_violation then duplicate_term:=true;
 end;
 if not duplicate_term then raise exception 'QA_TERM_OVERLAP_ALLOWED'; end if;
 begin
  perform public.pg_m002_create_term(actor,yr,'QA luar','2097-12-01'::date,
   '2098-01-30'::date,gen_random_uuid(),'QA-M2B-term-outside');
 exception when invalid_parameter_value then outside_year:=true;
 end;
 if not outside_year then raise exception 'QA_TERM_OUTSIDE_ALLOWED'; end if;
 program_obj:=public.pg_m002_create_catalog_entry(actor,'program','QA01',
  'QA Program',key_program,'QA-M2B-program');
 if program_obj<>public.pg_m002_create_catalog_entry(actor,'program','QA01',
  'QA Program',key_program,'QA-M2B-program-retry')
 then raise exception 'QA_PROGRAM_RETRY_CHANGED'; end if;
 subject_obj:=public.pg_m002_create_catalog_entry(actor,'subject','QAIPS',
  'QA Pelajaran',gen_random_uuid(),'QA-M2B-subject');
 begin
  perform public.pg_m002_create_catalog_entry(actor,'program','QA01',
   'Beda data',key_program,'QA-M2B-catalog-key-conflict');
 exception when unique_violation then catalog_conflict:=true;
 end;
 if not catalog_conflict then raise exception 'QA_CATALOG_KEY_CONFLICT_ALLOWED'; end if;
 class_obj:=public.pg_m002_create_class(actor,yr,'smp'::public.school_level,
  9,'IX QA',key_class,'QA-M2B-class');
 if class_obj<>public.pg_m002_create_class(actor,yr,'smp'::public.school_level,
  9,'IX QA',key_class,'QA-M2B-class-retry')
 then raise exception 'QA_CLASS_RETRY_CHANGED'; end if;
 begin
  perform public.pg_m002_create_class(actor,yr,'smp'::public.school_level,
   9,'ix qa',gen_random_uuid(),'QA-M2B-class-duplicate');
 exception when unique_violation then class_conflict:=true;
 end;
 if not class_conflict then raise exception 'QA_CLASS_CASE_DUPLICATE_ALLOWED'; end if;
 begin
  perform public.pg_m002_create_class(actor,yr,'sd'::public.school_level,
   9,'QA bad grade',gen_random_uuid(),'QA-M2B-invalid-class');
 exception when invalid_parameter_value then grade_blocked:=true;
 end;
 if not grade_blocked then raise exception 'QA_CLASS_GRADE_NOT_ENFORCED'; end if;
 begin
  perform public.pg_m002_create_catalog_entry(
  '00000000-0000-4000-8000-000000000099'::uuid,'subject',
  'QABAD','No access',gen_random_uuid(),'QA-M2B-denied');
 exception when insufficient_privilege then bad_actor:=true;
 end;
 if not bad_actor then raise exception 'QA_NONADMIN_ALLOWED'; end if;
 if (select count(*) from public.audit_events
   where request_id like 'QA-M2B-%')<>5
 then raise exception 'QA_AUDIT_MISMATCH'; end if;
 raise notice 'M002B_SQL_ALL_GATES_PASS';
end $qa$;
rollback;
select (select count(*) from public.academic_years) as persistent_years,
 (select count(*) from public.terms) as persistent_terms,
 (select count(*) from public.programs) as persistent_programs,
 (select count(*) from public.subjects) as persistent_subjects,
 (select count(*) from public.classes) as persistent_classes,
 (select count(*) from public.audit_events where request_id like 'QA-M2B-%') as persistent_qa_audits;
