-- M002: SQL transaction-only check. No lasting auth/user/session mutations.
-- Must be run only on the dedicated PortalGenius project. Uses one synthetic
-- session linked to the existing active account solely to satisfy FK.
begin;
do $qa$
declare
 actor uuid;
 handle_hash text;
 rec jsonb;
begin
 select auth_user_id into actor from public.accounts where active limit 1;
 if actor is null then raise exception 'QA_BLOCKED_NO_ACTIVE_ACCOUNT'; end if;
 handle_hash:=md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
 perform public.pg_auth_session_store(handle_hash,actor,'synthetic-only-lease-v1',1);
 rec:=public.pg_auth_session_get(handle_hash);
 if rec is null or (rec->>'version')::int<>1 then
  raise exception 'QA_INITIAL_SESSION_FAILED';
 end if;
 if not public.pg_auth_session_claim_refresh(handle_hash,1) then
  raise exception 'QA_FIRST_CLAIM_FAILED';
 end if;
 if public.pg_auth_session_claim_refresh(handle_hash,1) then
  raise exception 'QA_DUPLICATE_LEASE_ALLOWED';
 end if;
 if public.pg_auth_session_finish_refresh(handle_hash,2,'incorrect-version') then
  raise exception 'QA_STALE_VERSION_ALLOWED';
 end if;
 if not public.pg_auth_session_finish_refresh(handle_hash,1,'synthetic-only-lease-v2') then
  raise exception 'QA_LEASE_FINISH_FAILED';
 end if;
 if public.pg_auth_session_claim_refresh(handle_hash,1) then
  raise exception 'QA_STALE_RECLAIM_ALLOWED';
 end if;
 rec:=public.pg_auth_session_get(handle_hash);
 if (rec->>'version')::int<>2 then
  raise exception 'QA_VERSION_NOT_ROTATED';
 end if;
 perform public.pg_auth_session_revoke(handle_hash);
 if public.pg_auth_session_get(handle_hash) is not null then
  raise exception 'QA_REVOKED_SESSION_REPLAY';
 end if;
 raise notice 'M002_SQL_AUTH_LEASE_PASS';
end $qa$;
rollback;
