import { createClient } from '@/utils/supabase/server';
import VideoPlayer from '@/components/VideoPlayer';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { cookies } from 'next/headers';

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch lesson details. Rely on Database RLS to handle auth checks (enrolled user or admin)
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('title, youtube_id, courses(title), subjects(title)')
    .eq('id', lessonId)
    .single();

  if (lessonError || !lesson) {
    // Determine if it was an auth issue vs missing lesson, redirect appropriately
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
         <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied or Not Found</h1>
         <p className="text-muted-foreground mb-4">You may not be enrolled in this course or the lesson does not exist.</p>
         <Link href="/dashboard" className="text-blue-500 hover:text-blue-400">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row animate-in fade-in duration-500">
      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 flex flex-col gap-6 w-full max-w-5xl mx-auto">
        {/* Breadcrumb / Title */}
        <div>
          <Link href={`/dashboard/courses/${courseId}`} className="text-sm text-primary hover:text-primary/80 font-medium mb-2 inline-block">
            ← Back to Course
          </Link>
          <div className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-1">
             {(lesson.courses as any)?.title || 'Course'} / {(lesson.subjects as any)?.title || 'Subject'}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{lesson.title}</h1>
        </div>

        {/* Video Player */}
        <VideoPlayer youtubeId={lesson.youtube_id} />

        {/* Details Area */}
        <div className="glass-card p-6 mt-4">
           <h3 className="text-xl font-medium mb-2">About this lesson</h3>
           <p className="text-muted-foreground">
             Please watch the entire video to complete this lesson block.
           </p>
        </div>
      </main>
      
      {/* Sidebar - Playlist / Navigation */}
      <aside className="w-full md:w-80 border-l border-white/5 bg-secondary/30 p-6 flex flex-col gap-4">
        <h3 className="font-bold text-lg mb-2">Course Lessons</h3>
        <p className="text-sm text-muted-foreground">
          More lessons would appear here, fetched dynamically.
        </p>
        {/* Placeholder for lesson list */}
        <div className="glass p-4 rounded-lg border-l-4 border-l-blue-500">
           <p className="font-medium text-sm text-blue-500">{lesson.title}</p>
           <p className="text-xs text-muted-foreground mt-1">Currently playing</p>
        </div>
      </aside>
    </div>
  );
}
