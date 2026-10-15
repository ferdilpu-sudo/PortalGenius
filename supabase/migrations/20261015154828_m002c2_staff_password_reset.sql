-- M-002C2B: two-phase admin password reset audit / revocation.
-- One pending operation per target; unknown external Auth outcome stays locked
-- until an explicitly reviewed reconciliation operation is implemented.
create table private.staff_password_reset_ops (
 id uuid primary key,
 actor_id uuid not null references public.accounts(auth_user_id) on delete restrict,
 target_id uuid not null references public.accounts(auth_user_id) on delete restrict,
 state text not null default 'pending' check(state in ('pending','completed')),
 request_id text not null check(length(request_id) between 1 and 100),
 created_at timestamptz not null default now(),
 completed_at timestamptz,
 constraint reset_completed_consistency check(
  (state='pending' and completed_at is null)
  or (state='completed' and completed_at is not null)
 )
);
create unique index reset_single_pending_per_target
 on private.staff_password_reset_ops(target_id) where state='pending';
alter table private.staff_password_reset_ops enable row level security;
revoke all on private.staff_password_reset_ops from public,anon,authenticated;

create function public.pg_m002c2_begin_staff_password_reset(
 p_actor_id uuid,p_target_id uuid,p_operation_id uuid,p_request_id text
) returns jsonb language plpgsql volatile security definer set search_path=''
as $fn$
declare v_existing private.staff_password_reset_ops%rowtype;
begin
 if not exists(select 1 from public.accounts a join public.account_roles r
  on r.account_id=a.auth_user_id where a.auth_user_id=p_actor_id and a.active
  and not a.must_change_password and r.role='admin')
 then raise exception 'ACCESS_DENIED' using errcode='42501';end if;
 if p_target_id is null or p_operation_id is null or p_actor_id=p_target_id
  or p_request_id is null or pg_catalog.length(p_request_id) not between 1 and 100
 then raise exception 'INVALID_RESET_INPUT' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(20261015,2202);
 if not exists(select 1 from public.accounts a where a.auth_user_id=p_target_id
   and a.active
   and exists(select 1 from public.account_roles r where r.account_id=a.auth_user_id
    and r.role in ('teacher','counselor','principal'))
   and not exists(select 1 from public.account_roles r where r.account_id=a.auth_user_id
    and r.role='admin')
   and exists(select 1 from private.login_identities l where l.auth_user_id=a.auth_user_id
    and l.provisioning_state='ready')
   and exists(select 1 from auth.users u where u.id=a.auth_user_id
    and u.raw_app_meta_data->>'managed_by'='portalgenius'
    and u.raw_app_meta_data->>'identity_kind'='technical_email_no_delivery')
 ) then raise exception 'RESET_TARGET_UNAVAILABLE' using errcode='42501';end if;
 if exists(select 1 from private.staff_password_reset_ops r
  where r.id=p_operation_id or (r.target_id=p_target_id and r.state='pending'))
 then raise exception 'RESET_ALREADY_PENDING' using errcode='23505';end if;
 insert into private.staff_password_reset_ops(id,actor_id,target_id,request_id)
 values(p_operation_id,p_actor_id,p_target_id,p_request_id);
 update public.accounts set must_change_password=true,updated_at=now()
 where auth_user_id=p_target_id;
 perform public.pg_auth_revoke_all_user_sessions(p_target_id);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,changed_fields,request_id)
 values(p_actor_id,'account.password_reset_requested','account',p_target_id,
  array['must_change_password','sessions.revoked'],p_request_id);
 return pg_catalog.jsonb_build_object('operationId',p_operation_id,'state','pending');
end;
$fn$;

create function public.pg_m002c2_complete_staff_password_reset(
 p_actor_id uuid,p_target_id uuid,p_operation_id uuid
) returns boolean language plpgsql volatile security definer set search_path=''
as $fn$
declare v_request_id text;
begin
 if not exists(select 1 from public.accounts a join public.account_roles r
  on r.account_id=a.auth_user_id where a.auth_user_id=p_actor_id and a.active
  and not a.must_change_password and r.role='admin')
 then raise exception 'ACCESS_DENIED' using errcode='42501';end if;
 if p_target_id is null or p_operation_id is null or p_actor_id=p_target_id
 then raise exception 'INVALID_RESET_INPUT' using errcode='22023';end if;
 update private.staff_password_reset_ops
 set state='completed',completed_at=now()
 where id=p_operation_id and actor_id=p_actor_id and target_id=p_target_id
  and state='pending'
 returning request_id into v_request_id;
 if not found then raise exception 'RESET_OPERATION_NOT_PENDING' using errcode='42501';end if;
 -- The Auth update must have returned success in the trusted BFF before
 -- calling complete. The reset operation does not itself set a password.
 insert into public.audit_events(actor_id,action,entity_type,entity_id,changed_fields,request_id)
 values(p_actor_id,'account.password_reset_completed','account',p_target_id,
  array['password_credentials'],v_request_id);
 return true;
end;
$fn$;
revoke all on function public.pg_m002c2_begin_staff_password_reset(uuid,uuid,uuid,text),
 public.pg_m002c2_complete_staff_password_reset(uuid,uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.pg_m002c2_begin_staff_password_reset(uuid,uuid,uuid,text),
 public.pg_m002c2_complete_staff_password_reset(uuid,uuid,uuid)
 to service_role;
