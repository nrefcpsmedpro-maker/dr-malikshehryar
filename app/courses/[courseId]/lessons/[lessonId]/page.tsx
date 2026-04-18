import { createClient } from '@/utils/supabase/server';
import VideoPlayer from '@/components/VideoPlayer';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { cookies } from 'next/headers';

type LessonDetails = {
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
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ data: profile }, { data: lesson, error: lessonError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single(),
    supabase
      .from('lessons')
      .select('title, youtube_id, is_locked, courses(title), subjects(title, is_locked)')
      .eq('id', lessonId)
      .eq('course_id', courseId)
      .single(),
  ]);

  const isLockedForStudent = profile?.role !== 'admin' && (lesson?.is_locked || lesson?.subjects?.is_locked);

  if (lessonError || !lesson || isLockedForStudent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied or Not Found</h1>
        <p className="text-muted-foreground mb-4">
          {isLockedForStudent
            ? 'This lesson is locked by the administrator right now.'
            : 'You may not be enrolled in this course or the lesson does not exist.'}
        </p>
        <Link href="/dashboard" className="text-blue-500 hover:text-blue-400">Return to Dashboard</Link>
      </div>
    );
  }

  const lessonDetails = lesson as LessonDetails;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row animate-in fade-in duration-500">
      <main className="flex-1 p-6 md:p-8 flex flex-col gap-6 w-full max-w-5xl mx-auto">
        <div>
          <Link href={`/dashboard/courses/${courseId}`} className="text-sm text-primary hover:text-primary/80 font-medium mb-2 inline-block">
            ← Back to Course
          </Link>
          <div className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-1">
            {lessonDetails.courses?.title || 'Course'} / {lessonDetails.subjects?.title || 'Subject'}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{lessonDetails.title}</h1>
        </div>

        <VideoPlayer youtubeId={lessonDetails.youtube_id} />

        <div className="glass-card p-6 mt-4">
          <h3 className="text-xl font-medium mb-2">About this lesson</h3>
          <p className="text-muted-foreground">
            Please watch the entire video to complete this lesson block.
          </p>
        </div>
      </main>

      <aside className="w-full md:w-80 border-l border-white/5 bg-secondary/30 p-6 flex flex-col gap-4">
        <h3 className="font-bold text-lg mb-2">Course Lessons</h3>
        <p className="text-sm text-muted-foreground">
          More lessons would appear here, fetched dynamically.
        </p>
        <div className="glass p-4 rounded-lg border-l-4 border-l-blue-500">
          <p className="font-medium text-sm text-blue-500">{lessonDetails.title}</p>
          <p className="text-xs text-muted-foreground mt-1">Currently playing</p>
        </div>
      </aside>
    </div>
  );
}
