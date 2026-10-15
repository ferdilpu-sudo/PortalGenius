-- Applied to Supabase project vpglikrkvsnoyjvluigs on 2026-10-15.
-- Uses service_role-only API RPC privileges. Do not expose secrets to frontend.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.app_role as enum ('admin','teacher','counselor','principal');
create type private.provisioning_state as enum ('pending','ready','failed');

create table public.accounts (
 auth_user_id uuid primary key references auth.users(id) on delete restrict,
 display_name text not null check(char_length(btrim(display_name)) between 1 and 120),
 active boolean not null default false,
 must_change_password boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.account_roles (
 account_id uuid not null references public.accounts(auth_user_id) on delete restrict,
 role public.app_role not null,
 primary key(account_id,role)
);
create table public.audit_events (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid references public.accounts(auth_user_id) on delete restrict,
 action text not null,
 entity_type text not null,
 entity_id uuid,
 changed_fields text[] not null default '{}',
 request_id text not null,
 created_at timestamptz not null default now()
);
create table private.login_identities (
 auth_user_id uuid primary key references auth.users(id) on delete restrict,
 username_normalized text not null unique check(username_normalized ~ '^[a-z0-9._-]{3,32}$'),
 auth_alias text not null unique,
 provisioning_state private.provisioning_state not null default 'pending',
 created_at timestamptz not null default now()
);
create table private.app_sessions (
 id uuid primary key default gen_random_uuid(),
 handle_hash text not null unique check(handle_hash ~ '^[a-f0-9]{64}$'),
 auth_user_id uuid not null references auth.users(id) on delete restrict,
 encrypted_tokens text not null,
 key_version integer not null check(key_version > 0),
 expires_at timestamptz not null,
 last_seen_at timestamptz not null default now(),
 revoked_at timestamptz,
 refresh_lease_until timestamptz,
 version integer not null default 1 check(version > 0)
);
create index on private.app_sessions(auth_user_id,expires_at);
create index on private.app_sessions(expires_at);
create table private.rate_limit_buckets (
 key_hash text primary key,
 window_start timestamptz not null,
 attempt_count integer not null check(attempt_count > 0),
 expires_at timestamptz not null
);
create index on private.rate_limit_buckets(expires_at);

alter table public.accounts enable row level security;
alter table public.account_roles enable row level security;
alter table public.audit_events enable row level security;
alter table private.login_identities enable row level security;
alter table private.app_sessions enable row level security;
alter table private.rate_limit_buckets enable row level security;
revoke all on table public.accounts, public.account_roles, public.audit_events from anon,authenticated;
grant select on table public.accounts,public.account_roles to authenticated;
create policy accounts_self_read on public.accounts for select to authenticated
 using (auth_user_id = (select auth.uid()));
create policy account_roles_self_read on public.account_roles for select to authenticated
 using (account_id = (select auth.uid()));

create function public.pg_auth_resolve_alias(p_username text)
returns jsonb language sql stable security definer set search_path=''
as $$
 select jsonb_build_object('auth_user_id',l.auth_user_id,'auth_alias',l.auth_alias)
 from private.login_identities l join public.accounts a on a.auth_user_id=l.auth_user_id
 where l.username_normalized=p_username and l.provisioning_state='ready' and a.active=true;
$$;
create function public.pg_auth_login_slot(p_key_hash text,p_limit integer)
returns boolean language plpgsql volatile security definer set search_path=''
as $$
declare v_count integer;
begin
 if char_length(p_key_hash) <> 43 or p_limit not between 1 and 30 then return false; end if;
 insert into private.rate_limit_buckets(key_hash,window_start,attempt_count,expires_at)
 values(p_key_hash,now(),1,now()+interval '15 minutes')
 on conflict(key_hash) do update set
 attempt_count=case when private.rate_limit_buckets.expires_at<now() then 1
 else private.rate_limit_buckets.attempt_count+1 end,
 window_start=case when private.rate_limit_buckets.expires_at<now() then now()
 else private.rate_limit_buckets.window_start end,
 expires_at=case when private.rate_limit_buckets.expires_at<now() then now()+interval '15 minutes'
 else private.rate_limit_buckets.expires_at end
 returning attempt_count into v_count;
 return v_count <= p_limit;
end;
$$;
create function public.pg_auth_session_store(
 p_handle_hash text,p_auth_user_id uuid,p_encrypted_tokens text,p_key_version integer)
returns void language plpgsql volatile security definer set search_path=''
as $$
begin
 if char_length(p_handle_hash) <> 64 or p_key_version <= 0 then
  raise exception 'INVALID_SESSION';
 end if;
 if not exists(select 1 from public.accounts a where a.auth_user_id=p_auth_user_id and a.active) then
  raise exception 'ACCOUNT_INACTIVE';
 end if;
 insert into private.app_sessions(handle_hash,auth_user_id,encrypted_tokens,key_version,expires_at)
 values(p_handle_hash,p_auth_user_id,p_encrypted_tokens,p_key_version,now()+interval '8 hours');
end;
$$;
create function public.pg_auth_session_get(p_handle_hash text)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare result jsonb;
begin
 with valid as (
  update private.app_sessions s set last_seen_at=now()
  from public.accounts a
  where s.handle_hash=p_handle_hash and s.auth_user_id=a.auth_user_id
  and a.active and s.revoked_at is null and s.expires_at>now()
  and s.last_seen_at>now()-interval '60 minutes'
  returning s.auth_user_id,s.encrypted_tokens,s.key_version,s.version
 )
 select jsonb_build_object(
  'auth_user_id',v.auth_user_id,'encrypted_tokens',v.encrypted_tokens,
  'key_version',v.key_version,'version',v.version,
  'display_name',a.display_name,'must_change_password',a.must_change_password,
  'roles',coalesce((select jsonb_agg(r.role order by r.role)
   from public.account_roles r where r.account_id=v.auth_user_id),'[]'::jsonb)
 ) into result
 from valid v join public.accounts a on a.auth_user_id=v.auth_user_id;
 return result;
end;
$$;
create function public.pg_auth_session_revoke(p_handle_hash text)
returns void language sql volatile security definer set search_path=''
as $$
 update private.app_sessions set revoked_at=now()
 where handle_hash=p_handle_hash and revoked_at is null;
$$;
create function public.pg_auth_session_claim_refresh(p_handle_hash text,p_expected_version integer)
returns boolean language plpgsql volatile security definer set search_path=''
as $$
declare v_id uuid;
begin
 update private.app_sessions set refresh_lease_until=now()+interval '30 seconds'
 where handle_hash=p_handle_hash and version=p_expected_version
 and revoked_at is null and expires_at>now()
 and (refresh_lease_until is null or refresh_lease_until<now())
 returning id into v_id;
 return v_id is not null;
end;
$$;
create function public.pg_auth_session_finish_refresh(p_handle_hash text,p_expected_version integer,p_encrypted_tokens text)
returns boolean language plpgsql volatile security definer set search_path=''
as $$
declare v_id uuid;
begin
 update private.app_sessions set encrypted_tokens=p_encrypted_tokens,
 refresh_lease_until=null,version=version+1
 where handle_hash=p_handle_hash and version=p_expected_version
 and refresh_lease_until>now() and revoked_at is null and expires_at>now()
 returning id into v_id;
 return v_id is not null;
end;
$$;
create function public.pg_auth_alias_for_user(p_auth_user_id uuid)
returns text language sql stable security definer set search_path=''
as $$
 select l.auth_alias from private.login_identities l
 join public.accounts a on a.auth_user_id=l.auth_user_id
 where l.auth_user_id=p_auth_user_id and l.provisioning_state='ready' and a.active;
$$;
create function public.pg_auth_revoke_all_user_sessions(p_auth_user_id uuid)
returns void language sql volatile security definer set search_path=''
as $$
 update private.app_sessions set revoked_at=now()
 where auth_user_id=p_auth_user_id and revoked_at is null;
$$;
create function public.pg_auth_password_changed(p_auth_user_id uuid)
returns void language sql volatile security definer set search_path=''
as $$
 update public.accounts set must_change_password=false,updated_at=now()
 where auth_user_id=p_auth_user_id;
$$;
revoke all on function
 public.pg_auth_resolve_alias(text),
 public.pg_auth_login_slot(text,integer),
 public.pg_auth_session_store(text,uuid,text,integer),
 public.pg_auth_session_get(text),
 public.pg_auth_session_revoke(text),
 public.pg_auth_session_claim_refresh(text,integer),
 public.pg_auth_session_finish_refresh(text,integer,text),
 public.pg_auth_alias_for_user(uuid),
 public.pg_auth_revoke_all_user_sessions(uuid),
 public.pg_auth_password_changed(uuid)
from public,anon,authenticated;
grant execute on function
 public.pg_auth_resolve_alias(text),
 public.pg_auth_login_slot(text,integer),
 public.pg_auth_session_store(text,uuid,text,integer),
 public.pg_auth_session_get(text),
 public.pg_auth_session_revoke(text),
 public.pg_auth_session_claim_refresh(text,integer),
 public.pg_auth_session_finish_refresh(text,integer,text),
 public.pg_auth_alias_for_user(uuid),
 public.pg_auth_revoke_all_user_sessions(uuid),
 public.pg_auth_password_changed(uuid)
to service_role;
