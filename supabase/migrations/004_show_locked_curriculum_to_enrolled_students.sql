-- Allow enrolled students to view curriculum structure even when locked.
-- Locking is enforced at the app layer (student cannot open locked lesson content).

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
