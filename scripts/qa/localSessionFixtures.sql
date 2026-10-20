-- LOCAL-ONLY QA helper. Never apply this file to hosted Supabase projects.
-- Temporary CLI workspace creates this migration *only* for Session E2E.
create function public.pg_qa_bind_staff(
 p_user_id uuid, p_alias text, p_username text, p_role public.app_role
) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_user_id is null or p_alias is null or p_username !~ '^qa_[a-z0-9_]{3,24}$'
  or p_role not in ('admin','teacher','counselor','principal')
  or not exists(select 1 from auth.users u where u.id=p_user_id
   and u.email=p_alias and u.email_confirmed_at is not null
   and u.raw_app_meta_data->>'managed_by'='portalgenius')
 then raise exception 'INVALID_LOCAL_QA_USER' using errcode='42501';end if;
 insert into public.accounts(auth_user_id,display_name,active,must_change_password)
 values(p_user_id,'Synthetic QA',true,false);
 insert into private.login_identities(auth_user_id,username_normalized,auth_alias,provisioning_state)
 values(p_user_id,p_username,p_alias,'ready');
 insert into public.account_roles(account_id,role)values(p_user_id,p_role);
 return true;
end $$;
-- Replace token encryption for the synthetic session so actual BFF
-- restoreSession enters the refresh branch, without waiting an hour.
create function public.pg_qa_replace_tokens(p_hash text,p_encrypted text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if p_hash !~ '^[a-f0-9]{64}$' or p_encrypted is null
 then raise exception 'INVALID_QA_TOKEN_REPLACEMENT' using errcode='22023';end if;
 update private.app_sessions set encrypted_tokens=p_encrypted,
  refresh_lease_until=null where handle_hash=p_hash and revoked_at is null
 returning id into v_id;
 return v_id is not null;
end $$;
create function public.pg_qa_hold_lease(p_hash text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 update private.app_sessions set refresh_lease_until=now()+interval '40 seconds'
 where handle_hash=p_hash and revoked_at is null returning id into v_id;
 return v_id is not null;
end $$;
create function public.pg_qa_unbind_staff(p_user_id uuid)
returns boolean language plpgsql security definer set search_path='' as $qa$
begin
 if not exists(select 1 from private.login_identities l where l.auth_user_id=p_user_id
  and l.username_normalized like 'qa_%')
 then return false;end if;
 delete from private.app_sessions where auth_user_id=p_user_id;
 delete from public.account_roles where account_id=p_user_id;
 delete from private.login_identities where auth_user_id=p_user_id;
 delete from public.accounts where auth_user_id=p_user_id;
 return true;
end $qa$;
revoke all on function
 public.pg_qa_unbind_staff(uuid),
 public.pg_qa_bind_staff(uuid,text,text,public.app_role),
 public.pg_qa_replace_tokens(text,text),
 public.pg_qa_hold_lease(text)
 from public,anon,authenticated;
grant execute on function
 public.pg_qa_unbind_staff(uuid),
 public.pg_qa_bind_staff(uuid,text,text,public.app_role),
 public.pg_qa_replace_tokens(text,text),
 public.pg_qa_hold_lease(text)
 to service_role;
