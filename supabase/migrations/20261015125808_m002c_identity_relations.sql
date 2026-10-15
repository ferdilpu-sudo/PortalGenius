-- M-002C1 student/teacher/assignment relational schema. Empty, RLS deny-by-default.
-- No public signup, real students or auth users are created by this migration.
create table public.teachers (
 id uuid primary key default gen_random_uuid(),
 account_id uuid unique references public.accounts(auth_user_id) on delete restrict,
 code text not null unique check (code ~ '^[A-Z0-9_-]{2,32}$'),
 archived_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 version integer not null default 1 check(version>=1)
);
create table public.students (
 id uuid primary key default gen_random_uuid(),
 nis text not null unique check (nis=pg_catalog.btrim(nis) and char_length(nis) between 1 and 32),
 full_name text not null check (full_name=pg_catalog.btrim(full_name) and char_length(full_name) between 1 and 160),
 birth_place text check(birth_place is null or char_length(birth_place)<=160),
 birth_date date,
 registration_date date,
 archived_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 version integer not null default 1 check(version>=1)
);
create table public.student_guardians (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.students(id) on delete restrict,
 full_name text not null check(char_length(pg_catalog.btrim(full_name)) between 1 and 160),
 relationship text check(relationship is null or char_length(relationship)<=60),
 phone text check(phone is null or char_length(phone)<=30),
 address text check(address is null or char_length(address)<=1000),
 is_primary boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index student_guardians_student_id_idx on public.student_guardians(student_id);
create unique index one_primary_guardian_per_student on public.student_guardians(student_id)
 where is_primary;
create table public.enrollments (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.students(id) on delete restrict,
 class_id uuid not null references public.classes(id) on delete restrict,
 program_id uuid not null references public.programs(id) on delete restrict,
 start_date date not null,
 end_date date,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 version integer not null default 1 check(version>=1),
 constraint enrollment_positive_dates check(end_date is null or end_date>=start_date),
 constraint enrollment_distinct_start unique(student_id,start_date)
);
create index enrollments_class_idx on public.enrollments(class_id);
create table public.teaching_assignments (
 id uuid primary key default gen_random_uuid(),
 teacher_id uuid not null references public.teachers(id) on delete restrict,
 subject_id uuid not null references public.subjects(id) on delete restrict,
 term_id uuid not null references public.terms(id) on delete restrict,
 valid_from date not null,
 valid_to date,
 archived_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 version integer not null default 1 check(version>=1),
 constraint teaching_assignment_positive_dates check(valid_to is null or valid_to>=valid_from)
);
create index teaching_assignments_teacher_idx on public.teaching_assignments(teacher_id,term_id);
create table public.assignment_students (
 assignment_id uuid not null references public.teaching_assignments(id) on delete restrict,
 student_id uuid not null references public.students(id) on delete restrict,
 valid_from date not null,
 valid_to date,
 created_at timestamptz not null default now(),
 primary key(assignment_id,student_id,valid_from),
 constraint assignment_student_positive_dates check(valid_to is null or valid_to>=valid_from)
);
create index assignment_students_student_idx on public.assignment_students(student_id);
create table public.counselor_assignments (
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null references public.accounts(auth_user_id) on delete restrict,
 student_id uuid not null references public.students(id) on delete restrict,
 valid_from date not null,
 valid_to date,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 version integer not null default 1 check(version>=1),
 constraint counselor_positive_dates check(valid_to is null or valid_to>=valid_from),
 constraint counselor_assignment_distinct_start unique(account_id,student_id,valid_from)
);
create index counselor_assignments_student_idx on public.counselor_assignments(student_id);
alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.student_guardians enable row level security;
alter table public.enrollments enable row level security;
alter table public.teaching_assignments enable row level security;
alter table public.assignment_students enable row level security;
alter table public.counselor_assignments enable row level security;
-- No authenticated/anon SELECT policies: access is via bounded, service-only
-- projections which verify active account and assignments in the database.
revoke all on table public.teachers,public.students,public.student_guardians,
 public.enrollments,public.teaching_assignments,public.assignment_students,
 public.counselor_assignments from public,anon,authenticated;
