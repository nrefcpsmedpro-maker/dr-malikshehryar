import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ArrowLeft, CheckCircle2, LockKeyhole, PlayCircle, Timer } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { EmptyState } from '@/components/lms/EmptyState';
import { PageHeader } from '@/components/lms/PageHeader';
import { ProgressBar } from '@/components/lms/ProgressBar';
import { StatusBadge } from '@/components/lms/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Course, Lesson, LessonProgress, MockResult, MockTest, SubjectWithLessons } from '@/types/lms';
import { courseProgress, flattenLessons, percentage, sortByOrder } from '@/utils/lms';

type CourseProfile = {
  role: 'admin' | 'student';
};

export default async function StudentCourseOverview({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [{ data: profile }, { data: enrollments }, { data: courseData }, { data: resultsData }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('enrollments').select('id').eq('user_id', user.id).eq('course_id', courseId).limit(1),
    supabase.from('courses').select('id, title, description, thumbnail_url, created_at').eq('id', courseId).single(),
    supabase.from('mock_results').select('id, user_id, test_id, score, total_questions, created_at').eq('user_id', user.id),
  ]);

  const hasEnrollment = (enrollments?.length ?? 0) > 0;
  const userProfile = profile as CourseProfile | null;
  const course = courseData as Course | null;

  if ((userProfile?.role !== 'admin' && !hasEnrollment) || !course) {
    redirect('/dashboard');
  }

  const [{ data: subjectsData, error: subjectsError }, { data: mockTestsData }, { data: progressData }] = await Promise.all([
    supabase
      .from('subjects')
      .select('id, title, order_index, is_locked, lessons(id, title, order_index, is_locked)')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true }),
    supabase.from('mock_tests').select('id, course_id, title, description, time_limit_minutes, created_at').eq('course_id', courseId).order('created_at', { ascending: true }),
    supabase.from('lesson_progress').select('*').eq('user_id', user.id).eq('course_id', courseId),
  ]);

  let flatLessonsData: Lesson[] = [];
  if (!subjectsError && (subjectsData?.length ?? 0) === 0) {
    const { data } = await supabase
      .from('lessons')
      .select('id, title, order_index, is_locked')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });
    flatLessonsData = (data ?? []) as Lesson[];
  }

  const subjects = sortByOrder((subjectsData ?? []) as unknown as SubjectWithLessons[]);
  const lessons = flattenLessons(subjects, flatLessonsData);
  const lessonProgress = (progressData ?? []) as LessonProgress[];
  const progressByLesson = new Map(lessonProgress.map((item) => [item.lesson_id, item]));
  const completion = courseProgress(lessons, lessonProgress);
  const mockTests = (mockTestsData ?? []) as MockTest[];
  const results = (resultsData ?? []) as MockResult[];

  return (
    <div className="space-y-8">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} />
        Back to dashboard
      </Link>

      <PageHeader
        eyebrow="Course workspace"
        title={course.title}
        description={course.description || 'A structured course with protected lessons, curriculum blocks, and assessments.'}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <section className="space-y-5">
          <Card className="rounded-lg p-6 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Course progress</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {completion.completed} of {completion.total} lessons completed.
                </p>
              </div>
              <StatusBadge variant={completion.percent === 100 ? 'success' : 'info'}>
                {completion.percent}% complete
              </StatusBadge>
            </div>
            <ProgressBar value={completion.percent} className="mt-5" />
          </Card>

          <Card className="rounded-lg p-0 shadow-sm">
            <div className="border-b p-6">
              <h2 className="text-xl font-semibold">Curriculum</h2>
              <p className="mt-1 text-sm text-muted-foreground">Open lessons, review locked modules, and track completion.</p>
            </div>

            {lessons.length ? (
              <div className="divide-y">
                {subjects.length ? (
                  subjects.map((subject, subjectIndex) => {
                    const sortedLessons = sortByOrder(subject.lessons);
                    return (
                      <div key={subject.id} className="p-6">
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                            {subjectIndex + 1}
                          </span>
                          <h3 className="text-lg font-semibold">{subject.title}</h3>
                          {subject.is_locked && <StatusBadge variant="warning">Locked block</StatusBadge>}
                        </div>
                        <div className="space-y-3">
                          {sortedLessons.length ? (
                            sortedLessons.map((lesson, lessonIndex) => {
                              const locked = subject.is_locked || lesson.is_locked;
                              const done = Boolean(progressByLesson.get(lesson.id)?.completed_at);
                              return (
                                <LessonRow
                                  key={lesson.id}
                                  courseId={courseId}
                                  lesson={lesson}
                                  lessonIndex={lessonIndex}
                                  locked={locked}
                                  completed={done}
                                />
                              );
                            })
                          ) : (
                            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No lessons in this block yet.</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="space-y-3 p-6">
                    {flatLessonsData.map((lesson, lessonIndex) => (
                      <LessonRow
                        key={lesson.id}
                        courseId={courseId}
                        lesson={lesson}
                        lessonIndex={lessonIndex}
                        locked={lesson.is_locked}
                        completed={Boolean(progressByLesson.get(lesson.id)?.completed_at)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6">
                <EmptyState
                  icon={PlayCircle}
                  title="No lessons yet"
                  description="The course curriculum has not been published by an administrator."
                />
              </div>
            )}
          </Card>
        </section>

        <aside className="space-y-5">
          <Card className="rounded-lg p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Assessments</h2>
            <p className="mt-1 text-sm text-muted-foreground">Course-specific tests assigned to this course.</p>
            <div className="mt-5 space-y-3">
              {mockTests.length ? (
                mockTests.map((test) => {
                  const result = results.find((item) => item.test_id === test.id);
                  const score = result ? percentage(result.score, result.total_questions) : null;
                  return (
                    <div key={test.id} className="rounded-lg border bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{test.title}</p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Timer size={13} />
                            {test.time_limit_minutes} minutes
                          </p>
                        </div>
                        {result ? <StatusBadge variant={score && score >= 60 ? 'success' : 'danger'}>{score}%</StatusBadge> : <StatusBadge variant="info">New</StatusBadge>}
                      </div>
                      <Button asChild variant={result ? 'secondary' : 'default'} className="mt-4 w-full">
                        <Link href={`/dashboard/courses/${courseId}/tests/${test.id}`}>
                          {result ? 'View result' : 'Begin test'}
                        </Link>
                      </Button>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No course tests are available yet.</p>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function LessonRow({
  courseId,
  lesson,
  lessonIndex,
  locked,
  completed,
}: {
  courseId: string;
  lesson: Lesson;
  lessonIndex: number;
  locked: boolean;
  completed: boolean;
}) {
  const content = (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-background p-4 transition hover:border-primary/40">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-semibold">
          {completed ? <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-300" /> : lessonIndex + 1}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{lesson.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{locked ? 'Locked lesson' : completed ? 'Completed' : 'Video lesson'}</p>
        </div>
      </div>
      {locked ? <LockKeyhole size={18} className="text-amber-600 dark:text-amber-300" /> : <PlayCircle size={18} className="text-primary" />}
    </div>
  );

  if (locked) return content;

  return (
    <Link href={`/courses/${courseId}/lessons/${lesson.id}`} className="block">
      {content}
    </Link>
  );
}
