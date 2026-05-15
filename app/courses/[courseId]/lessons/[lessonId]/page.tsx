import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ArrowLeft, CheckCircle2, LockKeyhole, PlayCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import VideoPlayer from '@/components/VideoPlayer';
import PageSecurityShield from '@/components/PageSecurityShield';
import { StatusBadge } from '@/components/lms/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createVideoPlaybackToken, hashUserAgent } from '@/utils/videoTokens';
import type { Lesson, LessonProgress, SubjectWithLessons } from '@/types/lms';
import { flattenLessons, sortByOrder } from '@/utils/lms';

type LessonDetails = {
  id: string;
  title: string;
  youtube_id: string;
  is_locked: boolean;
  courses: { title: string } | null;
  subjects: { title: string; is_locked: boolean } | null;
};

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const cookieStore = await cookies();
  const headerStore = await headers();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [{ data: profile }, { data: lessonData, error: lessonError }, { data: subjectsData }, { data: progressData }] =
    await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      supabase
        .from('lessons')
        .select('id, title, youtube_id, is_locked, courses(title), subjects(title, is_locked)')
        .eq('id', lessonId)
        .eq('course_id', courseId)
        .single(),
      supabase
        .from('subjects')
        .select('id, title, order_index, is_locked, lessons(id, title, order_index, is_locked)')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true }),
      supabase.from('lesson_progress').select('*').eq('user_id', user.id).eq('course_id', courseId),
    ]);

  const lesson = lessonData as unknown as LessonDetails | null;
  const isLockedForStudent = profile?.role !== 'admin' && (lesson?.is_locked || lesson?.subjects?.is_locked);

  if (lessonError || !lesson || isLockedForStudent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-secondary/40 p-6 text-center">
        <Card className="max-w-lg rounded-lg p-8">
          <LockKeyhole className="mx-auto text-destructive" size={34} />
          <h1 className="mt-4 text-2xl font-semibold">Access denied or unavailable</h1>
          <p className="mt-3 text-muted-foreground">
            {isLockedForStudent
              ? 'This lesson is currently locked by the administrator.'
              : 'You may not be enrolled in this course or the lesson does not exist.'}
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard">Return to dashboard</Link>
          </Button>
        </Card>
      </main>
    );
  }

  const subjects = sortByOrder((subjectsData ?? []) as unknown as SubjectWithLessons[]);
  const lessons = flattenLessons(subjects) as Array<Lesson & { subjectTitle: string | null; subjectLocked: boolean }>;
  const currentIndex = lessons.findIndex((item) => item.id === lessonId);
  const previousLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const progress = (progressData ?? []) as LessonProgress[];
  const completedIds = new Set(progress.filter((item) => item.completed_at).map((item) => item.lesson_id));

  const userAgentHash = hashUserAgent(headerStore.get('user-agent'));
  const playbackToken = createVideoPlaybackToken(
    {
      userId: user.id,
      courseId,
      lessonId,
      youtubeId: lesson.youtube_id,
      userAgentHash,
    },
    120,
  );

  return (
    <main className="min-h-screen bg-secondary/40">
      <PageSecurityShield />
      <div className="mx-auto grid min-h-screen max-w-[1600px] gap-0 lg:grid-cols-[1fr_24rem]">
        <section className="p-4 sm:p-6 lg:p-8">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link href={`/dashboard/courses/${courseId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
              <ArrowLeft size={16} />
              Back to course
            </Link>
            <StatusBadge variant={completedIds.has(lessonId) ? 'success' : 'info'}>
              {completedIds.has(lessonId) ? 'Completed' : 'In progress'}
            </StatusBadge>
          </div>

          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
              {lesson.courses?.title || 'Course'} / {lesson.subjects?.title || 'Lesson'}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight lg:text-4xl">{lesson.title}</h1>
          </div>

          <VideoPlayer playbackToken={playbackToken} progressContext={{ courseId, lessonId }} />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <LessonNavLink label="Previous lesson" courseId={courseId} lesson={previousLesson} />
            <LessonNavLink label="Next lesson" courseId={courseId} lesson={nextLesson} alignRight />
          </div>
        </section>

        <aside className="border-t bg-background p-5 lg:border-l lg:border-t-0">
          <div className="sticky top-5">
            <h2 className="text-lg font-semibold">Course playlist</h2>
            <p className="mt-1 text-sm text-muted-foreground">Track completed lessons and move through the curriculum.</p>
            <div className="mt-5 max-h-[calc(100svh-8rem)] space-y-2 overflow-y-auto pr-1">
              {lessons.map((item, index) => {
                const active = item.id === lessonId;
                const locked = item.subjectLocked || item.is_locked;
                const complete = completedIds.has(item.id);
                const row = (
                  <div
                    className={`flex items-center gap-3 rounded-lg border p-3 text-sm transition ${
                      active ? 'border-primary bg-primary/10 text-primary' : 'bg-card hover:border-primary/40'
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background text-xs font-semibold">
                      {complete ? <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-300" /> : index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.subjectTitle || 'Course lesson'}</p>
                    </div>
                    {locked ? <LockKeyhole size={15} className="text-amber-600" /> : <PlayCircle size={15} />}
                  </div>
                );

                if (locked) return <div key={item.id}>{row}</div>;
                return (
                  <Link key={item.id} href={`/courses/${courseId}/lessons/${item.id}`}>
                    {row}
                  </Link>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function LessonNavLink({
  label,
  courseId,
  lesson,
  alignRight = false,
}: {
  label: string;
  courseId: string;
  lesson: (Lesson & { subjectLocked?: boolean }) | null;
  alignRight?: boolean;
}) {
  if (!lesson || lesson.is_locked || lesson.subjectLocked) {
    return (
      <div className={`rounded-lg border border-dashed bg-background p-4 ${alignRight ? 'text-right' : ''}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">No available lesson</p>
      </div>
    );
  }

  return (
    <Link href={`/courses/${courseId}/lessons/${lesson.id}`} className={`rounded-lg border bg-background p-4 transition hover:border-primary/40 ${alignRight ? 'text-right' : ''}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{label}</p>
      <p className="mt-1 font-medium">{lesson.title}</p>
    </Link>
  );
}
