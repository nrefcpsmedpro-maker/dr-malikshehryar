import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { CreateCourseDialog } from '@/components/CreateCourseDialog';
import { ManageCurriculumDialog } from '@/components/ManageCurriculumDialog';
import { ManageStudentsDialog } from '@/components/ManageStudentsDialog';
import { ManageTestsDialog } from '@/components/ManageTestsDialog';
import { EditCourseDialog } from '@/components/EditCourseDialog';
import { deleteCourseAction } from '@/app/admin/courses/actions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

export default async function AdminCoursesPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: courses, error } = await supabase
    .from('courses')
    .select('*, lessons(count), enrollments(count)')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground mt-2">
            Manage your courses, lessons, and students.
          </p>
        </div>
        <CreateCourseDialog />
      </div>

      {!courses?.length && !error && (
         <Card className="p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
           <h3 className="text-xl font-medium mb-2">No courses found</h3>
           <p className="text-muted-foreground max-w-md">
             You haven't created any courses yet. Click the button above to get started.
           </p>
         </Card>
      )}

      <div className="flex flex-col gap-4">
        {courses?.map((course) => (
          <Card key={course.id} className="flex flex-col sm:flex-row group overflow-hidden">
            <div className="w-full sm:w-48 sm:min-w-[12rem] aspect-video sm:aspect-auto bg-secondary/50 relative border-r border-border">
               {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity" />
               ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40 text-primary/50">
                    <span className="text-4xl font-bold">C</span>
                  </div>
               )}
            </div>
            
            <div className="p-5 flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
               <div className="flex-1">
                 <h3 className="text-lg font-bold truncate mb-1">{course.title}</h3>
                 <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                   {course.description || "No description provided."}
                 </p>
                 <div className="flex gap-4 text-xs font-medium bg-secondary/50 w-fit px-3 py-1 rounded-full">
                    <span className="text-primary">{course.lessons[0]?.count || 0} Lessons</span>
                    <span className="text-indigo-500">{course.enrollments[0]?.count || 0} Students</span>
                 </div>
               </div>
               
               <div className="flex flex-wrap items-center mt-3 sm:mt-0 gap-2"> 
                 <ManageCurriculumDialog courseId={course.id} courseTitle={course.title} />
                 <ManageStudentsDialog courseId={course.id} courseTitle={course.title} />
                 <ManageTestsDialog courseId={course.id} courseTitle={course.title} />
                 <div className="flex items-center gap-1 border-l border-border pl-2 ml-1">
                    <EditCourseDialog course={course} />
                    <form action={deleteCourseAction}>
                       <input type="hidden" name="courseId" value={course.id} />
                       <Button type="submit" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={16} />
                       </Button>
                    </form>
                 </div>
               </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
