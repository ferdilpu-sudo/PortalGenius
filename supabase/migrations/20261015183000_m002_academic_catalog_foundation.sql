-- M-002A: calendar and public academic catalogs. No fixtures or student data.
-- All direct client access remains closed until resource-specific RLS policies
-- and per-role projection tests are approved.
create type public.school_level as enum ('sd','smp','sma');

create table public.school_settings (
 id uuid primary key default gen_random_uuid(),
 singleton boolean not null default true unique check(singleton),
 school_name text not null check (char_length(btrim(school_name)) between 1 and 160),
 address text check (address is null or char_length(address)<=1000),
 city text not null check (char_length(btrim(city)) between 1 and 120),
 timezone text not null default 'Asia/Jakarta',
 principal_name text check (principal_name is null or char_length(principal_name)<=160),
 report_template_version text not null default '1',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table public.academic_years (
 id uuid primary key default gen_random_uuid(),
 label text not null check(char_length(btrim(label)) between 3 and 40 and label=btrim(label)),
 start_date date not null,
 end_date date not null,
 version integer not null default 1 check(version>=1),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint academic_year_positive_period check(start_date <= end_date)
);
create unique index academic_years_label_ci on public.academic_years (lower(label));
create index academic_years_date_range on public.academic_years(start_date,end_date);

create table public.terms (
 id uuid primary key default gen_random_uuid(),
 year_id uuid not null references public.academic_years(id) on delete restrict,
 name text not null check(char_length(btrim(name)) between 1 and 40),
 start_date date not null,
 end_date date not null,
 locked boolean not null default false,
 version integer not null default 1 check(version>=1),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint term_positive_period check(start_date <= end_date),
 constraint unique_term_name_per_year unique(year_id,name)
);

create table public.programs (
 id uuid primary key default gen_random_uuid(),
 code text not null unique check(code ~ '^[A-Z0-9_-]{2,32}$'),
 name text not null check(char_length(btrim(name)) between 1 and 120),
 archived_at timestamptz,
 version integer not null default 1 check(version>=1),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table public.subjects (
 id uuid primary key default gen_random_uuid(),
 code text not null unique check(code ~ '^[A-Z0-9_-]{2,32}$'),
 name text not null check(char_length(btrim(name)) between 1 and 120),
 archived_at timestamptz,
 version integer not null default 1 check(version>=1),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table public.classes (
 id uuid primary key default gen_random_uuid(),
 year_id uuid not null references public.academic_years(id) on delete restrict,
 level public.school_level not null,
 grade integer not null,
 name text not null check(char_length(btrim(name)) between 1 and 80),
 archived_at timestamptz,
 version integer not null default 1 check(version>=1),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint valid_grade_for_level check (
  (level='sd' and grade between 1 and 6) or
  (level='smp' and grade between 7 and 9) or
  (level='sma' and grade between 10 and 12)
 ),
 constraint unique_class_name_per_year unique(year_id,level,grade,name)
);

create table private.master_idempotency (
 actor_id uuid not null references public.accounts(auth_user_id) on delete restrict,
 operation text not null,
 request_key uuid not null,
 payload jsonb not null,
 result jsonb not null,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '24 hours',
 primary key(actor_id,operation,request_key)
);

alter table public.school_settings enable row level security;
alter table public.academic_years enable row level security;
alter table public.terms enable row level security;
alter table public.programs enable row level security;
alter table public.subjects enable row level security;
alter table public.classes enable row level security;
alter table private.master_idempotency enable row level security;

revoke all on table
 public.school_settings,public.academic_years,public.terms,public.programs,
 public.subjects,public.classes,private.master_idempotency
 from public,anon,authenticated;

-- Privileged BFF access is always mediated by verified user session and role.
grant select on public.academic_years to service_role;

create function public.pg_m002_create_academic_year(
 p_actor_id uuid,p_label text,p_start_date date,p_end_date date,
 p_idempotency_key uuid,p_request_id text
) returns jsonb
language plpgsql volatile security definer set search_path=''
as $function$
declare
 v_payload jsonb;
 v_saved private.master_idempotency%rowtype;
 v_year public.academic_years%rowtype;
 v_label text;
 v_result jsonb;
begin
 if not exists (
  select 1 from public.accounts a
  join public.account_roles r on r.account_id=a.auth_user_id
  where a.auth_user_id=p_actor_id and a.active and not a.must_change_password
    and r.role='admin'
 ) then
  raise exception 'ACCESS_DENIED' using errcode='42501';
 end if;
 v_label:=pg_catalog.btrim(p_label);
 if v_label is null or pg_catalog.char_length(v_label) not between 3 and 40
    or p_start_date is null or p_end_date is null
    or p_start_date>p_end_date
    or p_start_date < '2000-01-01'::date or p_end_date > '2100-12-31'::date
    or p_idempotency_key is null
    or p_request_id is null or char_length(p_request_id)>100 then
   raise exception 'INVALID_YEAR' using errcode='22023';
 end if;
 v_payload:=pg_catalog.jsonb_build_object(
  'label',v_label,'start_date',p_start_date,'end_date',p_end_date
 );
 -- One institution, bounded annual writes. Prevent overlapping date ranges.
 perform pg_catalog.pg_advisory_xact_lock(20261015,2002);
 select * into v_saved from private.master_idempotency
 where actor_id=p_actor_id and operation='academic_year.create'
 and request_key=p_idempotency_key;
 if found then
  if v_saved.payload<>v_payload then
   raise exception 'IDEMPOTENCY_CONFLICT' using errcode='23505';
  end if;
  return v_saved.result;
 end if;
 if exists (
  select 1 from public.academic_years y
  where pg_catalog.daterange(y.start_date,y.end_date,'[]') &&
        pg_catalog.daterange(p_start_date,p_end_date,'[]')
 ) then
  raise exception 'YEAR_PERIOD_OVERLAP' using errcode='23505';
 end if;
 insert into public.academic_years(label,start_date,end_date)
 values(v_label,p_start_date,p_end_date) returning * into v_year;
 v_result:=pg_catalog.jsonb_build_object(
  'id',v_year.id,'label',v_year.label,
  'startDate',v_year.start_date,'endDate',v_year.end_date,'version',v_year.version
 );
 insert into private.master_idempotency(actor_id,operation,request_key,payload,result)
 values(p_actor_id,'academic_year.create',p_idempotency_key,v_payload,v_result);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,changed_fields,request_id)
 values(p_actor_id,'academic_year.create','academic_year',v_year.id,
        array['label','start_date','end_date'],p_request_id);
 return v_result;
end;
$function$;

revoke all on function public.pg_m002_create_academic_year(uuid,text,date,date,uuid,text)
 from public,anon,authenticated;
grant execute on function public.pg_m002_create_academic_year(uuid,text,date,date,uuid,text)
 to service_role;
