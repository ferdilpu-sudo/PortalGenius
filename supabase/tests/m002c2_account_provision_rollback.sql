-- M-002C2 account provisioning contract tests. All identities are synthetic and rolled back.
begin;
do $qa$
declare
 actor uuid;
 user_teacher uuid:=gen_random_uuid();
 user_other uuid:=gen_random_uuid();
 user_selfsignup uuid:=gen_random_uuid();
 key uuid:=gen_random_uuid();
 first_result jsonb;
 retry_result jsonb;
 denied boolean:=false;
 mismatch boolean:=false;
 duplicate_name boolean:=false;
 unmanaged boolean:=false;
begin
 select a.auth_user_id into actor
 from public.accounts a join public.account_roles r on r.account_id=a.auth_user_id
 where a.active and not a.must_change_password and r.role='admin' limit 1;
 if actor is null then raise exception 'QA_BLOCKED_ADMIN_MISSING';end if;

 insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data)
 values
 (user_teacher,'authenticated','authenticated','qa-teacher@invalid.example',now(),
  '{"managed_by":"portalgenius"}'::jsonb),
 (user_other,'authenticated','authenticated','qa-other@invalid.example',now(),
  '{"managed_by":"portalgenius"}'::jsonb),
 (user_selfsignup,'authenticated','authenticated','qa-self@invalid.example',now(),
  '{}'::jsonb);

 first_result:=public.pg_m002c2_attach_account(actor,user_teacher,
  ' Qa_Teacher ','qa-teacher@invalid.example',' QA Teacher ','teacher',key,'qa-create');
 retry_result:=public.pg_m002c2_attach_account(actor,user_teacher,
  'qa_teacher','qa-teacher@invalid.example','QA Teacher','teacher',key,'qa-retry');
 if first_result<>retry_result or first_result->>'username'<>'qa_teacher'
  or first_result->>'mustChangePassword'<>'true'
 then raise exception 'QA_IDEMPOTENT_RESULT_INCORRECT';end if;

 if (select count(*) from public.accounts where auth_user_id=user_teacher)<>1 or
    (select count(*) from public.account_roles where account_id=user_teacher and role='teacher')<>1 or
    (select count(*) from private.login_identities
      where auth_user_id=user_teacher and provisioning_state='ready')<>1
 then raise exception 'QA_BINDING_NOT_ATOMIC';end if;

 begin
  perform public.pg_m002c2_attach_account(actor,user_teacher,
   'qa_teacher','qa-teacher@invalid.example','changed','teacher',key,'qa-conflict');
 exception when unique_violation then mismatch:=true;
 end;
 if not mismatch then raise exception 'QA_IDEMPOTENCY_KEY_REUSE_ALLOWED';end if;

 begin
  perform public.pg_m002c2_attach_account(actor,user_other,
   'qa_teacher','qa-other@invalid.example','Other','teacher',gen_random_uuid(),'qa-duplicate');
 exception when unique_violation then duplicate_name:=true;
 end;
 if not duplicate_name then raise exception 'QA_USERNAME_DUPLICATE_ALLOWED';end if;

 begin
  perform public.pg_m002c2_attach_account(actor,user_other,
   'qa_other','qa-other@invalid.example','Other','admin',gen_random_uuid(),'qa-admin');
 exception when invalid_parameter_value then denied:=true;
 end;
 if not denied then raise exception 'QA_ADMIN_ROLE_ESCALATION_ALLOWED';end if;

 begin
  perform public.pg_m002c2_attach_account(actor,user_selfsignup,
   'qa_self','qa-self@invalid.example','Self','teacher',gen_random_uuid(),'qa-self');
 exception when insufficient_privilege then unmanaged:=true;
 end;
 if not unmanaged then raise exception 'QA_UNMANAGED_AUTH_IDENTITY_ALLOWED';end if;

 begin
  perform public.pg_m002c2_attach_account(user_teacher,user_other,
   'qa_other','qa-other@invalid.example','Other','teacher',gen_random_uuid(),'qa-nonadmin');
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'QA_NONADMIN_ACTOR_ALLOWED';end if;

 if public.pg_m002c2_provision_result(actor,key)<>first_result
 then raise exception 'QA_RETRY_LOOKUP_MISMATCH';end if;
 if public.pg_m002c2_provision_result(actor,gen_random_uuid()) is not null
 then raise exception 'QA_UNKNOWN_KEY_MUST_BE_NULL';end if;

 if (select count(*) from public.audit_events where request_id='qa-create')<>1
 then raise exception 'QA_AUDIT_MISSING';end if;
 if has_function_privilege('anon',
    'public.pg_m002c2_attach_account(uuid,uuid,text,text,text,public.app_role,uuid,text)','execute') or
    has_function_privilege('authenticated',
    'public.pg_m002c2_provision_result(uuid,uuid)','execute') or
    not has_function_privilege('service_role',
    'public.pg_m002c2_provision_result(uuid,uuid)','execute')
 then raise exception 'QA_RPC_EXECUTE_LEAK';end if;

 raise notice 'M002C2_PROVISIONING_ROLLBACK_PASS';
end $qa$;
rollback;
select count(*) as unchanged_account_count from public.accounts;
