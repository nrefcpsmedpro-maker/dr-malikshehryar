alter table if exists public.subjects
  add column if not exists is_locked boolean not null default false;

alter table if exists public.lessons
  add column if not exists is_locked boolean not null default false;

alter table if exists public.subjects enable row level security;

drop policy if exists "Subjects viewable by admins." on public.subjects;
create policy "Subjects viewable by admins."
on public.subjects
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

drop policy if exists "Subjects viewable by enrolled students." on public.subjects;
create policy "Subjects viewable by enrolled students."
on public.subjects
for select
to authenticated
using (
  exists (
    select 1
    from public.enrollments
    where user_id = (select auth.uid())
      and course_id = subjects.course_id
  )
);

drop policy if exists "Subjects manageable by admins." on public.subjects;
create policy "Subjects manageable by admins."
on public.subjects
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'::user_role
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'::user_role
  )
);

drop policy if exists "Lessons viewable by enrolled students." on public.lessons;
create policy "Lessons viewable by enrolled students."
on public.lessons
for select
to authenticated
using (
  exists (
    select 1
    from public.enrollments
    where user_id = (select auth.uid())
      and course_id = lessons.course_id
  )
);

-- Students still cannot self-enroll.
-- The existing "Admins can create enrollments." policy remains the only insert policy on public.enrollments.
