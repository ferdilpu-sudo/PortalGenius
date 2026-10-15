-- Transaction-only QA; creates one synthetic technical staff identity and
-- one synthetic app session. ROLLBACK leaves operator credentials untouched.
begin;
do $qa$
declare
 operator_id uuid;
 staff_id uuid:=gen_random_uuid();
 alias text:='qa-'||pg_catalog.replace(gen_random_uuid()::text,'-','')||'@auth.portalgenius.invalid';
 handle text:=md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
 op uuid:=gen_random_uuid();
 other_op uuid:=gen_random_uuid();
 result jsonb;
 denied boolean;
begin
 select a.auth_user_id into operator_id from public.accounts a
 join public.account_roles r on r.account_id=a.auth_user_id
 where a.active and not a.must_change_password and r.role='admin' limit 1;
 if operator_id is null then raise exception 'NO_ADMIN_FOR_SYNTHETIC_FIXTURE';end if;
 insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data)
 values(staff_id,'authenticated','authenticated',alias,now(),
  '{"managed_by":"portalgenius","identity_kind":"technical_email_no_delivery"}'::jsonb);
 insert into public.accounts(auth_user_id,display_name,active,must_change_password)
 values(staff_id,'QA synthetic only',true,false);
 insert into public.account_roles(account_id,role)values(staff_id,'teacher');
 insert into private.login_identities(auth_user_id,username_normalized,auth_alias,provisioning_state)
 values(staff_id,'qa_reset_staff',alias,'ready');
 insert into private.app_sessions(handle_hash,auth_user_id,encrypted_tokens,key_version,expires_at)
 values(handle,staff_id,'synthetic-only-do-not-decrypt',1,now()+interval '1 hour');

 denied:=false;
 begin
  perform public.pg_m002c2_begin_staff_password_reset(
    staff_id,operator_id,gen_random_uuid(),'QA-reset-nonadmin');
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'NONADMIN_RESET_ALLOWED';end if;

 denied:=false;
 begin
  perform public.pg_m002c2_begin_staff_password_reset(
    operator_id,operator_id,gen_random_uuid(),'QA-reset-self');
 exception when invalid_parameter_value then denied:=true;end;
 if not denied then raise exception 'ADMIN_SELF_RESET_ALLOWED';end if;

 result:=public.pg_m002c2_begin_staff_password_reset(operator_id,staff_id,op,'QA-reset-start');
 if result->>'state'<>'pending' or result->>'operationId'<>op::text then
  raise exception 'PENDING_RESULT_INCORRECT';end if;
 if not (select must_change_password from public.accounts where auth_user_id=staff_id) then
  raise exception 'FORCED_PASSWORD_CHANGE_MISSING';end if;
 if (select revoked_at from private.app_sessions where handle_hash=handle) is null then
  raise exception 'SYNTHETIC_SESSION_NOT_REVOKED';end if;
 if (select count(*) from private.staff_password_reset_ops where id=op and state='pending')<>1
 then raise exception 'RESET_JOURNAL_MISSING';end if;

 denied:=false;
 begin
  perform public.pg_m002c2_begin_staff_password_reset(operator_id,staff_id,other_op,'QA-double-reset');
 exception when unique_violation then denied:=true;end;
 if not denied then raise exception 'CONCURRENT_RESET_NOT_BLOCKED';end if;
 denied:=false;
 begin
  perform public.pg_m002c2_begin_staff_password_reset(operator_id,staff_id,op,'QA-replay-key');
 exception when unique_violation then denied:=true;end;
 if not denied then raise exception 'REPLAY_RESET_KEY_ALLOWED';end if;

 denied:=false;
 begin
  perform public.pg_m002c2_complete_staff_password_reset(operator_id,staff_id,other_op);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'UNTRACKED_RESET_COMPLETE_ALLOWED';end if;

 if not public.pg_m002c2_complete_staff_password_reset(operator_id,staff_id,op) then
  raise exception 'RESET_COMPLETE_FAILED';end if;
 if (select state from private.staff_password_reset_ops where id=op)<>'completed' then
  raise exception 'RESET_JOURNAL_NOT_COMPLETED';end if;
 denied:=false;
 begin
  perform public.pg_m002c2_complete_staff_password_reset(operator_id,staff_id,op);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'RESET_COMPLETED_TWICE';end if;

 if (select count(*) from public.audit_events
    where action='account.password_reset_requested' and request_id='QA-reset-start')<>1 or
    (select count(*) from public.audit_events
    where action='account.password_reset_completed' and request_id='QA-reset-start')<>1
 then raise exception 'RESET_AUDIT_NOT_ATOMIC';end if;
 if has_function_privilege('anon',
  'public.pg_m002c2_begin_staff_password_reset(uuid,uuid,uuid,text)','EXECUTE') or
  has_function_privilege('authenticated',
  'public.pg_m002c2_complete_staff_password_reset(uuid,uuid,uuid)','EXECUTE') then
  raise exception 'RESET_RPC_PUBLIC_ACCESS';end if;
 raise notice 'M002C2_STAFF_PASSWORD_RESET_ROLLBACK_PASS';
end $qa$;
rollback;
select (select count(*) from public.accounts) as accounts_after_qa,
 (select count(*) from private.staff_password_reset_ops) as reset_ops_after_qa;
