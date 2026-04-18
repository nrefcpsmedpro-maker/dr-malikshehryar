'use client';

import { useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { getCourseData, enrollStudentAction } from '@/app/admin/courses/actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { X, Users } from 'lucide-react';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full shrink-0">
      {pending ? 'Enrolling...' : 'Grant Access'}
    </Button>
  );
}

export function ManageStudentsDialog({ courseId, courseTitle }: { courseId: string, courseTitle: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && !course) {
      setIsLoading(true);
      getCourseData(courseId).then(data => {
        setCourse(data);
        setIsLoading(false);
      });
    }
  }, [isOpen, courseId, course]);

  const handleEnroll = async (formData: FormData) => {
     await enrollStudentAction(courseId, formData);
     const newData = await getCourseData(courseId);
     setCourse(newData);
     (document.getElementById('form-enroll') as HTMLFormElement)?.reset();
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        <Users className="mr-2" size={14} />
        Students
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
               <div>
                  <h2 className="text-xl font-bold tracking-tight text-indigo-500">Manage Enrollments</h2>
                  <p className="text-muted-foreground text-sm font-medium">Course: {courseTitle}</p>
               </div>
               <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                 <X size={20} />
               </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {isLoading ? (
                 <div className="text-center py-12 text-muted-foreground">Loading enrollments...</div>
              ) : (
                 <>
                   <Card className="p-5 border-indigo-500/20 bg-indigo-500/5">
                      <h3 className="font-medium mb-3 text-sm">Enroll a New Student</h3>
                      <form id="form-enroll" action={handleEnroll} className="space-y-3">
                         <div className="space-y-1">
                           <Input type="email" name="email" required placeholder="student@example.com" />
                           <p className="text-[10px] text-muted-foreground ml-1">The student must be registered first.</p>
                         </div>
                         <SubmitButton />
                      </form>
                   </Card>

                   <div className="space-y-3">
                      <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">Current Students</h3>
                      {course?.enrollments?.map((enrollment: any) => (
                         <div key={enrollment.id} className="p-3 bg-secondary/30 rounded-md border border-border flex items-center justify-between">
                            <div>
                               <p className="text-sm font-medium">{enrollment.profiles?.email}</p>
                            </div>
                            <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-1 rounded">
                               Enrolled {new Date(enrollment.created_at).toLocaleDateString()}
                            </span>
                         </div>
                      ))}
                      {course?.enrollments?.length === 0 && (
                         <p className="text-sm italic text-muted-foreground">No students are enrolled yet.</p>
                      )}
                   </div>
                 </>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
