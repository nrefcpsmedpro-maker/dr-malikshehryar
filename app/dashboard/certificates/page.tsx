import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Award, CheckCircle2, LockKeyhole, Medal } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { CertificateDownload } from '@/components/CertificateDownload';
import { EmptyState } from '@/components/lms/EmptyState';
import { PageHeader } from '@/components/lms/PageHeader';
import { ProgressBar } from '@/components/lms/ProgressBar';
import { StatusBadge } from '@/components/lms/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Certificate, EnrollmentWithCourse, Lesson, LessonProgress } from '@/types/lms';
import { certificateCode, percentage, relationCount } from '@/utils/lms';

async function issueCertificateAction(formData: FormData) {
  'use server';

  const courseId = formData.get('courseId');
  if (typeof courseId !== 'string' || !courseId) return;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [{ data: enrollment }, { data: lessonsData }, { data: progressData }, { data: existing }] = await Promise.all([
    supabase.from('enrollments').select('id').eq('user_id', user.id).eq('course_id', courseId).maybeSingle(),
    supabase.from('lessons').select('id, title, order_index, is_locked').eq('course_id', courseId),
    supabase.from('lesson_progress').select('*').eq('user_id', user.id).eq('course_id', courseId),
    supabase.from('certificates').select('id').eq('user_id', user.id).eq('course_id', courseId).maybeSingle(),
  ]);

  if (!enrollment || existing) return;

  const lessons = (lessonsData ?? []) as Lesson[];
  const completed = new Set(((progressData ?? []) as LessonProgress[]).filter((item) => item.completed_at).map((item) => item.lesson_id));
  const eligible = lessons.length > 0 && lessons.every((lesson) => completed.has(lesson.id));

  if (!eligible) return;

  await supabase.from('certificates').insert([
    {
      user_id: user.id,
      course_id: courseId,
      certificate_code: certificateCode(courseId, user.id),
      final_score: null,
    },
  ]);

  revalidatePath('/dashboard/certificates');
}

export default async function CertificatesPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [{ data: profileData }, { data: enrollmentsData }, { data: progressData }, { data: certificatesData }] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
    supabase
      .from('enrollments')
      .select('id, user_id, course_id, created_at, courses(id, title, description, thumbnail_url, created_at, lessons(count))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('lesson_progress').select('*').eq('user_id', user.id),
    supabase
      .from('certificates')
      .select('id, user_id, course_id, certificate_code, final_score, issued_at, courses(id, title, description)')
      .eq('user_id', user.id)
      .order('issued_at', { ascending: false }),
  ]);

  const profile = profileData as { full_name: string | null; email: string } | null;
  const studentName = profile?.full_name || profile?.email || 'Student';
  const enrollments = (enrollmentsData ?? []) as unknown as EnrollmentWithCourse[];
  const progress = (progressData ?? []) as LessonProgress[];
  const certificates = (certificatesData ?? []) as unknown as Certificate[];
  const certificateCourseIds = new Set(certificates.map((certificate) => certificate.course_id));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Achievements"
        title="Certificates"
        description="Certificates are available when every lesson in an enrolled course is completed."
      />

      {certificates.length > 0 && (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {certificates.map((certificate) => (
            <Card key={certificate.id} className="overflow-hidden rounded-lg shadow-sm">
              <div className="border-b bg-primary/10 p-6">
                <Medal className="text-primary" size={30} />
                <h2 className="mt-4 text-xl font-semibold">{certificate.courses?.title ?? 'Course certificate'}</h2>
                <p className="mt-2 text-sm text-muted-foreground">Issued {new Date(certificate.issued_at).toLocaleDateString()}</p>
              </div>
              <div className="p-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Certificate code</p>
                <p className="mt-2 font-mono text-sm font-semibold">{certificate.certificate_code}</p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <StatusBadge variant="success">
                    Verified completion
                  </StatusBadge>
                  <CertificateDownload
                    studentName={studentName}
                    courseName={certificate.courses?.title ?? 'Course'}
                    certificateCode={certificate.certificate_code}
                    issuedAt={certificate.issued_at}
                  />
                </div>
              </div>
            </Card>
          ))}
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Eligible courses</h2>
        {!enrollments.length ? (
          <EmptyState
            icon={Award}
            title="No courses available"
            description="Enrollments are required before certificate progress can be tracked."
          />
        ) : (
          <div className="grid gap-4">
            {enrollments.map((enrollment) => {
              const course = enrollment.courses;
              if (!course) return null;
              const lessonCount = relationCount(course.lessons);
              const courseProgress = progress.filter((item) => item.course_id === course.id && item.completed_at).length;
              const completePercent = percentage(courseProgress, lessonCount);
              const issued = certificateCourseIds.has(course.id);
              const eligible = lessonCount > 0 && courseProgress >= lessonCount;

              return (
                <Card key={course.id} className="rounded-lg p-5 shadow-sm">
                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">{course.title}</h3>
                        {issued ? (
                          <StatusBadge variant="success">Issued</StatusBadge>
                        ) : eligible ? (
                          <StatusBadge variant="info">Ready</StatusBadge>
                        ) : (
                          <StatusBadge variant="warning">In progress</StatusBadge>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {courseProgress} of {lessonCount} lessons completed.
                      </p>
                      <div className="mt-4 max-w-xl">
                        <ProgressBar value={completePercent} />
                      </div>
                    </div>

                    {issued ? (
                      <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                        <CheckCircle2 size={18} />
                        Certificate issued
                      </div>
                    ) : eligible ? (
                      <form action={issueCertificateAction}>
                        <input type="hidden" name="courseId" value={course.id} />
                        <Button type="submit">
                          Issue certificate
                        </Button>
                      </form>
                    ) : (
                      <div className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <LockKeyhole size={17} />
                        Complete lessons first
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
