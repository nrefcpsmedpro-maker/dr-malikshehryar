import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Card } from '@/components/ui/card';

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

  if (!user) {
    redirect('/login');
  }

  const [{ data: profile }, { data: enrollments }, { data: course }, { data: results }] = await Promise.all([
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single(),
    supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .limit(1),
    supabase
      .from('courses')
      .select('id, title, description')
      .eq('id', courseId)
      .single(),
    supabase
      .from('mock_results')
      .select('test_id, score, total_questions')
      .eq('user_id', user.id),
  ]);

  const hasEnrollment = (enrollments?.length ?? 0) > 0;

  if ((profile?.role !== 'admin' && !hasEnrollment) || !course) {
    redirect('/dashboard');
  }

  const [{ data: subjectsData, error: subjectsError }, { data: mockTestsData, error: mockTestsError }] = await Promise.all([
    supabase
      .from('subjects')
      .select(`
        id,
        title,
        order_index,
        is_locked,
        lessons (
          id,
          title,
          order_index,
          is_locked
        )
      `)
      .eq('course_id', courseId)
      .order('order_index', { ascending: true }),
    supabase
      .from('mock_tests')
      .select('id, title, time_limit_minutes, created_at')
      .eq('course_id', courseId)
      .order('created_at', { ascending: true }),
  ]);

  const subjects = [...(subjectsData ?? [])].sort((a, b) => a.order_index - b.order_index);
  let flatLessonsData: Array<{ id: string; title: string; order_index: number; is_locked: boolean }> = [];
  let flatLessonsError: unknown = null;

  // Fallback for legacy courses that have lessons but no subject blocks.
  if (!subjectsError && subjects.length === 0) {
    const { data, error } = await supabase
      .from('lessons')
      .select('id, title, order_index, is_locked')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    flatLessonsData = data ?? [];
    flatLessonsError = error;
  }

  const flatLessons = [...flatLessonsData].sort((a, b) => a.order_index - b.order_index);
  const mockTests = mockTestsData ?? [];
  const hasCurriculumQueryError = Boolean(subjectsError) || Boolean(flatLessonsError);
  const hasMockTestsQueryError = Boolean(mockTestsError);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div>
        <Link href="/dashboard" className="text-primary hover:text-primary/80 text-sm font-medium mb-2 inline-block">
          &larr; Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
        <p className="text-muted-foreground mt-2">{course.description}</p>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-6">Course Curriculum</h2>

        {subjects.length > 0 ? (
          <div className="space-y-8">
            {subjects.map((subject, subjectIndex) => {
              const sortedLessons = [...(subject.lessons ?? [])].sort((a, b) => a.order_index - b.order_index);

              return (
                <div key={subject.id} className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-border pb-2">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <span className="text-primary">Block {subjectIndex + 1}:</span>
                      {subject.title}
                    </h3>
                    {subject.is_locked && (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                        Locked
                      </span>
                    )}
                  </div>

                  {subject.is_locked ? (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">
                      This subject is locked by the administrator. Its lessons will become available after it is unlocked.
                    </div>
                  ) : sortedLessons.length > 0 ? (
                    <div className="space-y-2 pl-2">
                      {sortedLessons.map((lesson, lessonIndex) =>
                        lesson.is_locked ? (
                          <div
                            key={lesson.id}
                            className="glass rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 border-l-4 border-l-amber-500"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-sm font-bold text-amber-600">
                                  {lessonIndex + 1}
                                </div>
                                <div>
                                  <p className="font-medium text-amber-700">{lesson.title}</p>
                                  <p className="text-xs text-muted-foreground">Locked lesson</p>
                                </div>
                              </div>
                              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Locked</span>
                            </div>
                          </div>
                        ) : (
                          <Link
                            key={lesson.id}
                            href={`/courses/${courseId}/lessons/${lesson.id}`}
                            className="glass p-4 rounded-lg flex items-center justify-between group bg-background/50 hover:bg-background transition-colors border-l-4 border-l-primary/50 hover:border-l-primary shadow-sm"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                {lessonIndex + 1}
                              </div>
                              <div>
                                <p className="font-medium group-hover:text-primary transition-colors">{lesson.title}</p>
                                <p className="text-xs text-muted-foreground">Video Lesson</p>
                              </div>
                            </div>
                            <div className="text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                              Start Video &rarr;
                            </div>
                          </Link>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="text-sm italic text-muted-foreground pl-2">No lessons added to this subject yet.</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : flatLessons.length > 0 ? (
          <div className="space-y-2 pl-2">
            {flatLessons.map((lesson, lessonIndex) =>
              lesson.is_locked ? (
                <div
                  key={lesson.id}
                  className="glass rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 border-l-4 border-l-amber-500"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-sm font-bold text-amber-600">
                        {lessonIndex + 1}
                      </div>
                      <div>
                        <p className="font-medium text-amber-700">{lesson.title}</p>
                        <p className="text-xs text-muted-foreground">Locked lesson</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Locked</span>
                  </div>
                </div>
              ) : (
                <Link
                  key={lesson.id}
                  href={`/courses/${courseId}/lessons/${lesson.id}`}
                  className="glass p-4 rounded-lg flex items-center justify-between group bg-background/50 hover:bg-background transition-colors border-l-4 border-l-primary/50 hover:border-l-primary shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {lessonIndex + 1}
                    </div>
                    <div>
                      <p className="font-medium group-hover:text-primary transition-colors">{lesson.title}</p>
                      <p className="text-xs text-muted-foreground">Video Lesson</p>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Start Video &rarr;
                  </div>
                </Link>
              )
            )}
          </div>
        ) : hasCurriculumQueryError ? (
          <div className="text-center py-8">
            <p className="text-amber-600 font-medium">Curriculum is temporarily unavailable.</p>
            <p className="text-sm text-muted-foreground mt-1">Please contact admin to check course visibility settings.</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground italic">No curriculum has been added to this course yet.</p>
          </div>
        )}
      </Card>

      {!hasMockTestsQueryError && mockTests.length > 0 && (
        <div className="pt-8 mt-8 border-t border-border">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">Mock Tests & Assessments</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockTests.map((test) => {
              const userResult = results?.find((result) => result.test_id === test.id);

              return (
                <Card key={test.id} className="p-5 flex flex-col border-l-4 border-l-primary">
                  <h4 className="font-bold text-lg mb-1">{test.title}</h4>
                  <p className="text-sm text-muted-foreground mb-4">{test.time_limit_minutes} Min Limit</p>

                  <div className="mt-auto">
                    {userResult ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/50 border border-border text-sm">
                        <span className="text-muted-foreground">Score:</span>
                        <span className="font-bold">{userResult.score} / {userResult.total_questions}</span>
                        <span
                          className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                            userResult.score / userResult.total_questions >= 0.6
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-destructive/10 text-destructive'
                          }`}
                        >
                          {userResult.score / userResult.total_questions >= 0.6 ? 'PASSED' : 'FAILED'}
                        </span>
                      </div>
                    ) : (
                      <Link
                        href={`/dashboard/courses/${courseId}/tests/${test.id}`}
                        className="inline-block w-full text-center px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-medium transition-colors"
                      >
                        Begin Test
                      </Link>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
