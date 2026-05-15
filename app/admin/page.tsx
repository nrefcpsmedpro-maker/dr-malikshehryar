import Link from 'next/link';
import { Award, BookOpen, FileQuestion, LineChart, Mail, PlayCircle, Users } from 'lucide-react';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { CreateCourseDialog } from '@/components/CreateCourseDialog';
import { PageHeader } from '@/components/lms/PageHeader';
import { StatCard } from '@/components/lms/StatCard';
import { StatusBadge } from '@/components/lms/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const metadata = {
  title: 'Admin Dashboard | MedPro LMS',
  description: 'Manage courses, students, exams, leads, and academy progress.',
};

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [
    { count: courseCount },
    { count: studentCount },
    { count: lessonCount },
    { count: testCount },
    { count: examCount },
    { count: leadCount },
    { count: certificateCount },
    { data: recentCourses },
  ] = await Promise.all([
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('lessons').select('*', { count: 'exact', head: true }),
    supabase.from('mock_tests').select('*', { count: 'exact', head: true }),
    supabase.from('mock_exams').select('*', { count: 'exact', head: true }),
    supabase.from('marketing_leads').select('*', { count: 'exact', head: true }),
    supabase.from('certificates').select('*', { count: 'exact', head: true }),
    supabase.from('courses').select('id, title, created_at').order('created_at', { ascending: false }).limit(5),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin workspace"
        title="Academy overview"
        description="A professional command center for content, students, assessments, leads, and outcomes."
        actions={<CreateCourseDialog />}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Courses" value={courseCount ?? 0} detail="Published learning spaces" icon={BookOpen} />
        <StatCard label="Students" value={studentCount ?? 0} detail="Registered student profiles" icon={Users} tone="emerald" />
        <StatCard label="Lessons" value={lessonCount ?? 0} detail="Protected video lessons" icon={PlayCircle} tone="amber" />
        <StatCard label="Certificates" value={certificateCount ?? 0} detail="Completion awards issued" icon={Award} tone="violet" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
        <Card className="rounded-lg p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Operational focus</h2>
              <p className="mt-1 text-sm text-muted-foreground">Fast access to the highest-value admin workflows.</p>
            </div>
            <Button asChild variant="secondary">
              <Link href="/admin/analytics">View analytics</Link>
            </Button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { label: 'Course tests', value: testCount ?? 0, icon: FileQuestion, href: '/admin/tests' },
              { label: 'Standalone exams', value: examCount ?? 0, icon: Award, href: '/admin/exams' },
              { label: 'Marketing leads', value: leadCount ?? 0, icon: Mail, href: '/admin/analytics' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.label} href={item.href} className="rounded-lg border bg-background p-5 transition hover:border-primary/40">
                  <Icon className="text-primary" size={22} />
                  <p className="mt-4 text-3xl font-semibold">{item.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card className="rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent courses</h2>
            <LineChart size={20} className="text-primary" />
          </div>
          <div className="mt-5 space-y-3">
            {recentCourses?.length ? (
              recentCourses.map((course) => (
                <Link key={course.id} href={`/admin/courses/${course.id}/builder`} className="flex items-center justify-between rounded-lg border bg-background p-3 transition hover:border-primary/40">
                  <span className="truncate text-sm font-medium">{course.title}</span>
                  <StatusBadge>Builder</StatusBadge>
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No courses created yet.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
