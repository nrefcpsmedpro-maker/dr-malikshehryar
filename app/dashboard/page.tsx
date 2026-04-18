import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';

export const metadata = {
  title: 'My Dashboard | MedPro LMS',
  description: 'View your enrolled courses and progress.',
};

export default async function StudentDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('courses(*, lessons(count))')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Courses</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here are the courses you are currently enrolled in.
        </p>
      </div>

      {!enrollments?.length && (
         <div className="glass-card p-12 text-center rounded-xl flex flex-col items-center justify-center min-h-[300px]">
           <h3 className="text-xl font-medium mb-2">No courses yet</h3>
           <p className="text-muted-foreground max-w-md">
             You haven't been enrolled in any courses yet. Once an administrator assigns you a course, it will appear here.
           </p>
         </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {enrollments?.map((enrollment: any) => {
          const course = enrollment.courses;
          if (!course) return null;
          
          return (
            <Link key={course.id} href={`/dashboard/courses/${course.id}`} className="glass-card flex flex-col group overflow-hidden hover:border-blue-500/50 transition-colors">
              <div className="aspect-video bg-secondary/50 relative">
                 {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity" />
                 ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900/20 to-indigo-900/40 text-blue-500/50">
                      <span className="text-5xl">C</span>
                    </div>
                 )}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                 <h3 className="text-lg font-bold truncate mb-1 group-hover:text-blue-400 transition-colors">{course.title}</h3>
                 <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                   {course.description || "No description provided."}
                 </p>
                 <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                   <div className="flex gap-4 text-xs text-muted-foreground font-medium">
                      <span>{course.lessons[0]?.count || 0} Lessons</span>
                   </div>
                   <span className="text-blue-500 text-sm font-medium">
                     Open Course &rarr;
                   </span>
                 </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
