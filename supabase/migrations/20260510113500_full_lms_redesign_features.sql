-- Full LMS redesign feature tables: marketing leads, lesson progress, and certificates.

create table if not exists public.marketing_leads (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text not null,
  phone text,
  goal text not null,
  message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.marketing_leads enable row level security;

drop policy if exists "Marketing leads can be created publicly." on public.marketing_leads;
create policy "Marketing leads can be created publicly."
on public.marketing_leads
for insert
to anon, authenticated
with check (true);

drop policy if exists "Marketing leads viewable by admins." on public.marketing_leads;
create policy "Marketing leads viewable by admins."
on public.marketing_leads
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'::user_role
  )
);

create table if not exists public.lesson_progress (
  user_id uuid references public.profiles on delete cascade not null,
  course_id uuid references public.courses on delete cascade not null,
  lesson_id uuid references public.lessons on delete cascade not null,
  last_position_seconds integer default 0,
  duration_seconds integer default 0,
  completed_at timestamp with time zone,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, lesson_id)
);

alter table public.lesson_progress enable row level security;

drop policy if exists "Users can view own lesson progress." on public.lesson_progress;
create policy "Users can view own lesson progress."
on public.lesson_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Admins can view all lesson progress." on public.lesson_progress;
create policy "Admins can view all lesson progress."
on public.lesson_progress
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'::user_role
  )
);

drop policy if exists "Users can insert own lesson progress." on public.lesson_progress;
create policy "Users can insert own lesson progress."
on public.lesson_progress
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own lesson progress." on public.lesson_progress;
create policy "Users can update own lesson progress."
on public.lesson_progress
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create table if not exists public.certificates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  course_id uuid references public.courses on delete cascade not null,
  certificate_code text not null unique,
  final_score numeric,
  issued_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, course_id)
);

alter table public.certificates enable row level security;

drop policy if exists "Users can view own certificates." on public.certificates;
create policy "Users can view own certificates."
on public.certificates
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Admins can view all certificates." on public.certificates;
create policy "Admins can view all certificates."
on public.certificates
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'::user_role
  )
);

drop policy if exists "Users can issue own certificates." on public.certificates;
create policy "Users can issue own certificates."
on public.certificates
for insert
to authenticated
with check ((select auth.uid()) = user_id);
