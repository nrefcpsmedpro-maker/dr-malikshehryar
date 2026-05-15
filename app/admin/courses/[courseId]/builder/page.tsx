import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ArrowLeft, BookOpen, Lock, Plus, Trash2, Unlock, Video } from 'lucide-react';
import {
  addLessonAction,
  addSubjectAction,
  removeLessonAction,
  removeSubjectAction,
  toggleLessonLockAction,
  toggleSubjectLockAction,
} from '@/app/admin/courses/actions';
import { createClient } from '@/utils/supabase/server';
import { EmptyState } from '@/components/lms/EmptyState';
import { PageHeader } from '@/components/lms/PageHeader';
import { StatusBadge } from '@/components/lms/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { Course, SubjectWithLessons } from '@/types/lms';
import { sortByOrder } from '@/utils/lms';

export default async function CourseBuilderPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: courseData, error } = await supabase
    .from('courses')
    .select('id, title, description, thumbnail_url, created_at')
    .eq('id', courseId)
    .single();

  if (error || !courseData) redirect('/admin/courses');

  const { data: subjectsData } = await supabase
    .from('subjects')
    .select('id, title, order_index, is_locked, lessons(id, title, youtube_id, order_index, is_locked, created_at)')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });

  const course = courseData as Course;
  const subjects = sortByOrder((subjectsData ?? []) as unknown as SubjectWithLessons[]);
  const addSubject = addSubjectAction.bind(null, courseId);
  const addLesson = addLessonAction.bind(null, courseId);
  const removeSubject = removeSubjectAction.bind(null, courseId);
  const removeLesson = removeLessonAction.bind(null, courseId);
  const toggleSubjectLock = toggleSubjectLockAction.bind(null, courseId);
  const toggleLessonLock = toggleLessonLockAction.bind(null, courseId);

  return (
    <div className="space-y-8">
      <Link href="/admin/courses" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} />
        Back to courses
      </Link>

      <PageHeader
        eyebrow="Course builder"
        title={course.title}
        description="Build the course curriculum with subject blocks, protected lessons, and lock controls."
      />

      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        <aside className="space-y-5">
          <Card className="rounded-lg p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Add subject block</h2>
            <p className="mt-1 text-sm text-muted-foreground">Create a module to organize lessons.</p>
            <form action={addSubject} className="mt-5 space-y-3">
              <Input name="title" required placeholder="e.g. Cardiology" />
              <Button type="submit" className="w-full">
                <Plus size={17} className="mr-2" />
                Add block
              </Button>
            </form>
          </Card>
        </aside>

        <section className="space-y-5">
          {!subjects.length ? (
            <EmptyState
              icon={BookOpen}
              title="No curriculum blocks yet"
              description="Add your first subject block, then attach YouTube lessons to build the course."
            />
          ) : (
            subjects.map((subject, subjectIndex) => (
              <Card key={subject.id} className="rounded-lg p-0 shadow-sm">
                <div className="flex flex-col gap-4 border-b p-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                      {subjectIndex + 1}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold">{subject.title}</h2>
                        {subject.is_locked && <StatusBadge variant="warning">Locked</StatusBadge>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{subject.lessons?.length ?? 0} lessons</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={toggleSubjectLock}>
                      <input type="hidden" name="subjectId" value={subject.id} />
                      <input type="hidden" name="isLocked" value={subject.is_locked ? 'true' : 'false'} />
                      <Button type="submit" variant="secondary" size="sm">
                        {subject.is_locked ? <Unlock size={15} className="mr-2" /> : <Lock size={15} className="mr-2" />}
                        {subject.is_locked ? 'Unlock' : 'Lock'}
                      </Button>
                    </form>
                    <form action={removeSubject}>
                      <input type="hidden" name="subjectId" value={subject.id} />
                      <Button type="submit" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                        <Trash2 size={17} />
                      </Button>
                    </form>
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  {sortByOrder(subject.lessons).map((lesson, lessonIndex) => (
                    <div key={lesson.id} className="flex flex-col gap-3 rounded-lg border bg-background p-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-sm font-semibold">
                          {lessonIndex + 1}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{lesson.title}</p>
                            {lesson.is_locked && <StatusBadge variant="warning">Locked</StatusBadge>}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">YouTube ID: {lesson.youtube_id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <form action={toggleLessonLock}>
                          <input type="hidden" name="lessonId" value={lesson.id} />
                          <input type="hidden" name="isLocked" value={lesson.is_locked ? 'true' : 'false'} />
                          <Button type="submit" variant="secondary" size="sm">
                            {lesson.is_locked ? <Unlock size={15} className="mr-2" /> : <Lock size={15} className="mr-2" />}
                            {lesson.is_locked ? 'Unlock' : 'Lock'}
                          </Button>
                        </form>
                        <form action={removeLesson}>
                          <input type="hidden" name="lessonId" value={lesson.id} />
                          <Button type="submit" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                            <Trash2 size={17} />
                          </Button>
                        </form>
                      </div>
                    </div>
                  ))}

                  <form action={addLesson} className="grid gap-3 rounded-lg border border-dashed bg-secondary/40 p-4 md:grid-cols-[1fr_1fr_auto]">
                    <input type="hidden" name="subject_id" value={subject.id} />
                    <Input name="title" required placeholder="Lesson title" />
                    <Input name="youtube_id" required placeholder="YouTube URL or ID" />
                    <Button type="submit">
                      <Video size={17} className="mr-2" />
                      Add lesson
                    </Button>
                  </form>
                </div>
              </Card>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
