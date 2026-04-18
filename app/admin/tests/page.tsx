import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { FileQuestion, Trash2, PlusCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default async function AdminTestsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Fetch all mock tests across all courses
  const { data: tests, error: testsError } = await supabase
    .from('mock_tests')
    .select(`*, course:courses(title)`)
    .order('created_at', { ascending: false });

  // Fetch just courses for the creation dropdown
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title')
    .order('created_at', { ascending: false });

  // SERVER ACTIONS
  const addTest = async (formData: FormData) => {
    'use server';
    const courseId = formData.get('course_id') as string;
    const title = formData.get('title') as string;
    const timeLimit = parseInt(formData.get('time_limit') as string) || 30;
    
    if (!courseId) return;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    await supabase.from('mock_tests').insert([{ course_id: courseId, title, time_limit_minutes: timeLimit }]);
    revalidatePath(`/admin/tests`);
    revalidatePath(`/admin/courses/${courseId}`);
  };

  const deleteTest = async (formData: FormData) => {
    'use server';
    const testId = formData.get('testId') as string;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    await supabase.from('mock_tests').delete().eq('id', testId);
    revalidatePath(`/admin/tests`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div>
         <h1 className="text-3xl font-bold tracking-tight">Global Test Directory</h1>
         <p className="text-muted-foreground mt-2 max-w-3xl">
           Manage all Mock Tests across your entire LMS platform from this central hub.
         </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Test form */}
          <Card className="p-6 h-fit sticky top-8">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
               <PlusCircle className="text-primary" />
               Draft New Test
            </h3>
            
            <form action={addTest} className="space-y-4">
               <div className="space-y-1">
                 <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Assign to Course</label>
                 <select name="course_id" required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="" className="text-background bg-foreground">Select a Course...</option>
                    {courses?.map((c) => (
                       <option key={c.id} value={c.id} className="text-background bg-foreground">{c.title}</option>
                    ))}
                 </select>
               </div>
               <div className="space-y-1">
                 <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Test Title</label>
                 <Input type="text" name="title" required placeholder="e.g. Finals Prep" />
               </div>
               <div className="space-y-1">
                 <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Time Limit (Minutes)</label>
                 <Input type="number" name="time_limit" required defaultValue="30" min="1" />
               </div>

               <Button type="submit" disabled={!courses?.length} className="w-full mt-4">
                 {courses?.length ? 'Create Global Test' : 'Create a Course First'}
               </Button>
            </form>
          </Card>

          {/* Test Listing */}
          <div className="lg:col-span-2 space-y-4">
             {tests?.map((test: any) => (
                <Card key={test.id} className="p-5 flex items-center justify-between group">
                   <div>
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-widest">{test.course?.title || 'Unknown Course'}</span>
                      <h4 className="font-bold text-lg mt-1 flex items-center gap-2">
                         <FileQuestion size={18} className="text-muted-foreground" /> 
                         {test.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">{test.time_limit_minutes} Min Limit</p>
                   </div>
                   
                   <div className="flex items-center gap-3">
                      <Button asChild variant="outline">
                         <Link href={`/admin/courses/${test.course_id}/tests/${test.id}`}>
                            Open Builder &rarr;
                         </Link>
                      </Button>
                      <form action={deleteTest}>
                         <input type="hidden" name="testId" value={test.id} />
                         <Button type="submit" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                            <Trash2 size={18} />
                         </Button>
                      </form>
                   </div>
                </Card>
             ))}

             {!tests?.length && (
                <Card className="text-center p-12">
                   <p className="text-muted-foreground">No mock tests exist across the platform yet.</p>
                </Card>
             )}
          </div>
      </div>
    </div>
  );
}
