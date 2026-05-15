import Link from 'next/link';
import { cookies } from 'next/headers';
import { Award, BookOpen, ClipboardCheck, FileQuestion, PlayCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { CourseCard } from '@/components/lms/CourseCard';
import { EmptyState } from '@/components/lms/EmptyState';
import { PageHeader } from '@/components/lms/PageHeader';
import { ProgressBar } from '@/components/lms/ProgressBar';
import { StatCard } from '@/components/lms/StatCard';
import { StatusBadge } from '@/components/lms/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { EnrollmentWithCourse, LessonProgress, MockExamWithSubjects, MockResult } from '@/types/lms';
import { percentage, relationCount } from '@/utils/lms';

export const metadata = {
  title: 'Student Dashboard | MedPro LMS',
  description: 'View courses, progress, exams, and certificates.',
};

export default async function StudentDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: enrollmentsData }, { data: progressData }, { data: resultsData }, { data: examsData }, { data: certificatesData }] =
    await Promise.all([
      supabase
        .from('enrollments')
        .select('id, user_id, course_id, created_at, courses(id, title, description, thumbnail_url, created_at, lessons(count))')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false }),
      supabase.from('lesson_progress').select('*').eq('user_id', user!.id),
      supabase.from('mock_results').select('id, user_id, test_id, score, total_questions, created_at').eq('user_id', user!.id),
      supabase
        .from('mock_exams')
        .select('id, title, description, time_mode, total_time_minutes, question_order, attempt_mode, created_at, subjects:exam_subjects(id, title, order_index, time_limit_minutes, questions:exam_questions(count))')
        .order('created_at', { ascending: false })
        .limit(3),
      supabase.from('certificates').select('id').eq('user_id', user!.id),
    ]);

  const enrollments = (enrollmentsData ?? []) as unknown as EnrollmentWithCourse[];
  const progress = (progressData ?? []) as LessonProgress[];
  const results = (resultsData ?? []) as MockResult[];
  const exams = (examsData ?? []) as unknown as MockExamWithSubjects[];
  const completedLessons = progress.filter((item) => item.completed_at).length;
  const totalLessons = enrollments.reduce((sum, enrollment) => sum + relationCount(enrollment.courses?.lessons), 0);
  const overallProgress = percentage(completedLessons, totalLessons);
  const averageScore = results.length
    ? Math.round(results.reduce((sum, result) => sum + percentage(result.score, result.total_questions), 0) / results.length)
    : 0;

  const continueCourse = enrollments.find((enrollment) => {
    const lessonCount = relationCount(enrollment.courses?.lessons);
    return lessonCount > 0;
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Student workspace"
        title="Learning dashboard"
        description="Track your courses, continue protected lessons, practice exams, and collect certificates."
        actions={
          <Button asChild>
            <Link href="/dashboard/exams">Open mock exams</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Enrolled courses" value={enrollments.length} detail="Active course access" icon={BookOpen} />
        <StatCard label="Lessons complete" value={`${completedLessons}/${totalLessons}`} detail={`${overallProgress}% overall progress`} icon={PlayCircle} tone="emerald" />
        <StatCard label="Tests submitted" value={results.length} detail={results.length ? `${averageScore}% average score` : 'No attempts yet'} icon={ClipboardCheck} tone="amber" />
        <StatCard label="Certificates" value={certificatesData?.length ?? 0} detail="Issued achievements" icon={Award} tone="violet" />
      </div>

      {continueCourse?.courses && (
        <Card className="overflow-hidden rounded-lg p-0 shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-6 md:p-8">
              <StatusBadge variant="info">Continue learning</StatusBadge>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">{continueCourse.courses.title}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Resume your current academy course, review the curriculum, and complete the next lesson block.
              </p>
              <div className="mt-6 max-w-md">
                <div className="mb-2 flex items-center justify-between text-sm font-medium">
                  <span>Course progress</span>
                  <span>{overallProgress}%</span>
                </div>
                <ProgressBar value={overallProgress} />
              </div>
              <Button asChild className="mt-6">
                <Link href={`/dashboard/courses/${continueCourse.courses.id}`}>
                  Continue course
                </Link>
              </Button>
            </div>
            <div className="border-t bg-secondary/50 p-6 lg:border-l lg:border-t-0">
              <p className="text-sm font-semibold">Latest mock exams</p>
              <div className="mt-4 space-y-3">
                {exams.length ? (
                  exams.map((exam) => (
                    <Link
                      key={exam.id}
                      href={`/dashboard/exams/${exam.id}`}
                      className="flex items-center justify-between rounded-lg border bg-background p-4 transition hover:border-primary/40"
                    >
                      <div>
                        <p className="font-medium">{exam.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{exam.total_time_minutes} minutes</p>
                      </div>
                      <FileQuestion size={18} className="text-primary" />
                    </Link>
                  ))
                ) : (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No standalone exams have been published yet.</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">My courses</h2>
            <p className="mt-1 text-sm text-muted-foreground">Courses assigned by your academy administrator.</p>
          </div>
        </div>

        {!enrollments.length ? (
          <EmptyState
            icon={BookOpen}
            title="No courses assigned yet"
            description="Once an administrator enrolls you in a course, your lessons and tests will appear here."
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {enrollments.map((enrollment) => {
              const course = enrollment.courses;
              if (!course) return null;
              const lessonCount = relationCount(course.lessons);
              const courseCompletedLessons = progress.filter((item) => item.course_id === course.id && item.completed_at).length;

              return (
                <CourseCard
                  key={course.id}
                  href={`/dashboard/courses/${course.id}`}
                  title={course.title}
                  description={course.description}
                  thumbnailUrl={course.thumbnail_url}
                  lessonCount={lessonCount}
                  progress={lessonCount ? percentage(courseCompletedLessons, lessonCount) : 0}
                  meta="Self-paced"
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
