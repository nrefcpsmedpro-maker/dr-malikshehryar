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
  const { data: { user } } = await supabase.auth.getUser();

  // Validate enrollment implicitly by selecting via RLS
  const { data: course, error } = await supabase
    .from('courses')
    .select(`
      *,
      subjects (
         *,
         lessons (*)
      ),
      mock_tests (*)
    `)
    .eq('id', courseId)
    .single();

  const { data: results } = await supabase
    .from('mock_results')
    .select('*')
    .eq('user_id', user?.id || '');

  if (error || !course) {
    redirect('/dashboard');
  }

  // Sort subjects
  const subjects = course.subjects?.sort((a: any, b: any) => a.order_index - b.order_index) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div>
        <Link href="/dashboard" className="text-primary hover:text-primary/80 text-sm font-medium mb-2 inline-block">
          &larr; Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
        <p className="text-muted-foreground mt-2">
          {course.description}
        </p>
      </div>

       <Card className="p-6">
          <h2 className="text-xl font-bold mb-6">Course Curriculum</h2>
          
          {subjects.length > 0 ? (
            <div className="space-y-8">
               {subjects.map((subject: any, sIdx: number) => {
                  const sortedLessons = subject.lessons?.sort((a: any, b: any) => a.order_index - b.order_index) || [];
                  
                  return (
                     <div key={subject.id} className="space-y-4">
                        <h3 className="font-bold text-lg border-b border-border pb-2 flex items-center gap-2">
                          <span className="text-primary">Block {sIdx + 1}:</span>
                          {subject.title}
                        </h3>
                        
                        {sortedLessons.length > 0 ? (
                           <div className="space-y-2 pl-2">
                              {sortedLessons.map((lesson: any, lIdx: number) => (
                                 <Link 
                                    key={lesson.id} 
                                    href={`/courses/${courseId}/lessons/${lesson.id}`}
                                    className="glass p-4 rounded-lg flex items-center justify-between group bg-background/50 hover:bg-background transition-colors border-l-4 border-l-primary/50 hover:border-l-primary shadow-sm"
                                 >
                                    <div className="flex items-center gap-4">
                                       <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                          {lIdx + 1}
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
                              ))}
                           </div>
                        ) : (
                           <p className="text-sm italic text-muted-foreground pl-2">No lessons added to this subject yet.</p>
                        )}
                     </div>
                  );
               })}
            </div>
          ) : (
            <div className="text-center py-8">
               <p className="text-muted-foreground italic">No curriculum has been added to this course yet.</p>
            </div>
          )}
       </Card>

         {/* Mock Tests Section */}
         {course.mock_tests && course.mock_tests.length > 0 && (
            <div className="pt-8 mt-8 border-t border-border">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">Mock Tests & Assessments</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {course.mock_tests.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((test: any) => {
                      const userResult = results?.find(r => r.test_id === test.id);
                      
                      return (
                          <Card key={test.id} className="p-5 flex flex-col border-l-4 border-l-primary">
                             <h4 className="font-bold text-lg mb-1">{test.title}</h4>
                             <p className="text-sm text-muted-foreground mb-4">{test.time_limit_minutes} Min Limit</p>
                             
                             <div className="mt-auto">
                               {userResult ? (
                                 <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/50 border border-border text-sm">
                                    <span className="text-muted-foreground">Score:</span> 
                                    <span className="font-bold">{userResult.score} / {userResult.total_questions}</span>
                                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${userResult.score / userResult.total_questions >= 0.6 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                                       {userResult.score / userResult.total_questions >= 0.6 ? 'PASSED' : 'FAILED'}
                                    </span>
                                 </div>
                               ) : (
                                 <Link href={`/dashboard/courses/${courseId}/tests/${test.id}`} className="inline-block w-full text-center px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-medium transition-colors">
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
