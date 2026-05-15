'use client';

import { useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { getCourseData, addTestAction } from '@/app/admin/courses/actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { X, FileQuestion } from 'lucide-react';

type CourseData = Awaited<ReturnType<typeof getCourseData>>;
type DialogTest = NonNullable<NonNullable<CourseData>['mock_tests']>[number];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full shrink-0">
      {pending ? 'Creating...' : '+ Create Test'}
    </Button>
  );
}

export function ManageTestsDialog({ courseId, courseTitle }: { courseId: string, courseTitle: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [course, setCourse] = useState<CourseData>(null);
  const [isPending, startTransition] = useTransition();

  const openDialog = () => {
    setIsOpen(true);
    if (!course) {
      startTransition(async () => {
        const data = await getCourseData(courseId);
        setCourse(data);
      });
    }
  };

  const handleAddTest = async (formData: FormData) => {
     await addTestAction(courseId, formData);
     const newData = await getCourseData(courseId);
     setCourse(newData);
     (document.getElementById('form-add-test') as HTMLFormElement)?.reset();
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={openDialog}>
        <FileQuestion className="mr-2" size={14} />
        Tests
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
               <div>
                  <h2 className="text-xl font-bold tracking-tight text-purple-500">Manage Mock Tests</h2>
                  <p className="text-muted-foreground text-sm font-medium">Course: {courseTitle}</p>
               </div>
               <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                 <X size={20} />
               </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {isPending && !course ? (
                 <div className="text-center py-12 text-muted-foreground">Loading tests...</div>
              ) : (
                 <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                   <div className="md:col-span-2 space-y-4">
                      <Card className="p-4 border-purple-500/20 bg-purple-500/5">
                         <h3 className="font-medium mb-3 text-sm">Create New Test</h3>
                         <form id="form-add-test" action={handleAddTest} className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Test Title</label>
                              <Input type="text" name="title" required placeholder="Midterm..." className="h-9 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Time Limit (Min)</label>
                              <Input type="number" name="time_limit" required defaultValue="30" min="1" className="h-9 text-sm" />
                            </div>
                            <SubmitButton />
                         </form>
                      </Card>
                   </div>

                   <div className="md:col-span-3 space-y-3">
                      <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">Available Tests</h3>
                      {[...(course?.mock_tests ?? [])].sort((a: DialogTest, b: DialogTest) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((test: DialogTest) => (
                         <div key={test.id} className="p-4 bg-secondary/30 rounded-md border border-border border-l-4 border-l-purple-500 flex flex-col gap-3">
                            <div>
                               <h4 className="font-bold text-sm">{test.title}</h4>
                               <p className="text-[11px] text-muted-foreground">{test.time_limit_minutes} Min Limit</p>
                            </div>
                            <Button asChild size="sm" variant="secondary" className="w-full text-xs h-7 hover:bg-purple-500 hover:text-white transition-colors">
                              <Link href={`/admin/courses/${courseId}/tests/${test.id}`}>
                                Open Builder &rarr;
                              </Link>
                            </Button>
                         </div>
                      ))}
                      {course?.mock_tests?.length === 0 && (
                         <div className="p-6 border border-dashed border-border rounded-lg text-center">
                           <p className="text-sm italic text-muted-foreground">No tests created yet.</p>
                         </div>
                      )}
                   </div>
                 </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
