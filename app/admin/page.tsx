import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateCourseDialog } from '@/components/CreateCourseDialog';

export const metadata = {
  title: 'Admin Dashboard | MedPro LMS',
  description: 'Manage courses, lessons, and student enrollments.',
};

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Fetch counts efficiently using Supabase's count option
  const { count: courseCount } = await supabase.from('courses').select('*', { count: 'exact', head: true });
  const { count: studentCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
  const { count: lessonCount } = await supabase.from('lessons').select('*', { count: 'exact', head: true });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of your LMS platform. You can manage courses and users here.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 flex flex-col gap-2">
          <h3 className="text-lg font-medium">Total Courses</h3>
          <p className="text-4xl font-bold text-primary">{courseCount || 0}</p>
        </Card>
        <Card className="p-6 flex flex-col gap-2">
          <h3 className="text-lg font-medium">Active Students</h3>
          <p className="text-4xl font-bold text-indigo-500">{studentCount || 0}</p>
        </Card>
        <Card className="p-6 flex flex-col gap-2">
           <h3 className="text-lg font-medium">Total Lessons</h3>
          <p className="text-4xl font-bold text-emerald-500">{lessonCount || 0}</p>
        </Card>
      </div>
      
      <Card className="p-8 text-center mt-8 space-y-4">
        <h3 className="text-xl font-medium">Ready to start?</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Begin by creating your first course and adding YouTube lessons to it.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
           <CreateCourseDialog />
           <Button asChild variant="secondary">
             <Link href="/admin/users">Manage Users</Link>
           </Button>
           <Button asChild variant="outline">
             <Link href="/admin/tests">Manage Tests</Link>
           </Button>
        </div>
      </Card>
    </div>
  );
}
