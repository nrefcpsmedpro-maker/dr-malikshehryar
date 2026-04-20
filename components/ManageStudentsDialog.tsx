'use client';

import { useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { enrollStudentAction, getManageStudentsData, unenrollStudentAction } from '@/app/admin/courses/actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Users } from 'lucide-react';

type ManageStudentsData = Awaited<ReturnType<typeof getManageStudentsData>>;

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} className="w-full shrink-0">
      {pending ? 'Enrolling...' : 'Grant Access'}
    </Button>
  );
}

function UnenrollButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" size="sm" disabled={pending} className="text-destructive hover:text-destructive">
      {pending ? 'Removing...' : 'Remove'}
    </Button>
  );
}

export function ManageStudentsDialog({ courseId, courseTitle }: { courseId: string, courseTitle: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<ManageStudentsData>(null);
  const [isPending, startTransition] = useTransition();

  const openDialog = () => {
    setIsOpen(true);

    if (!data) {
      startTransition(async () => {
        const result = await getManageStudentsData(courseId);
        setData(result);
      });
    }
  };

  const handleEnroll = async (formData: FormData) => {
     await enrollStudentAction(courseId, formData);
     const newData = await getManageStudentsData(courseId);
     setData(newData);
     (document.getElementById('form-enroll') as HTMLFormElement)?.reset();
  };

  const handleUnenroll = async (formData: FormData) => {
     await unenrollStudentAction(courseId, formData);
     const newData = await getManageStudentsData(courseId);
     setData(newData);
  };

  const enrolledUserIds = new Set(data?.course?.enrollments?.map((enrollment) => enrollment.user_id) ?? []);
  const registeredStudents = data?.students ?? [];
  const availableStudents = registeredStudents.filter((student) => !enrolledUserIds.has(student.id));

  return (
    <>
      <Button variant="outline" size="sm" onClick={openDialog}>
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
              {isPending && !data ? (
                 <div className="text-center py-12 text-muted-foreground">Loading enrollments...</div>
              ) : (
                 <>
                   <Card className="p-5 border-indigo-500/20 bg-indigo-500/5">
                      <h3 className="font-medium mb-3 text-sm">Enroll a New Student</h3>
                      <form id="form-enroll" action={handleEnroll} className="space-y-3">
                         <div className="space-y-1">
                           <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                             Registered Students
                           </label>
                           <select
                             name="userId"
                             required
                             defaultValue=""
                             className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                           >
                             <option value="" disabled>
                               Select a registered student
                             </option>
                             {registeredStudents.map((student) => {
                               const isEnrolled = enrolledUserIds.has(student.id);
                               const studentName = student.full_name?.trim() || student.email;
                               const details = [
                                 student.full_name?.trim() ? student.email : null,
                                 student.is_approved ? null : 'Pending approval',
                                 isEnrolled ? 'Already enrolled' : null,
                               ]
                                 .filter(Boolean)
                                 .join(' · ');

                               return (
                                 <option key={student.id} value={student.id} disabled={isEnrolled}>
                                   {details ? `${studentName} · ${details}` : studentName}
                                 </option>
                               );
                             })}
                           </select>
                           <p className="text-[10px] text-muted-foreground ml-1">
                             {registeredStudents.length === 0
                               ? 'No registered student accounts were found.'
                               : availableStudents.length === 0
                                 ? 'Every registered student already has access to this course.'
                                 : `${availableStudents.length} registered student${availableStudents.length === 1 ? ' is' : 's are'} available to enroll.`}
                           </p>
                         </div>
                         <SubmitButton disabled={availableStudents.length === 0} />
                      </form>
                   </Card>

                   <div className="space-y-3">
                      <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">Current Students</h3>
                       {data?.course?.enrollments?.map((enrollment) => {
                          const profile = Array.isArray(enrollment.profiles) ? enrollment.profiles[0] : enrollment.profiles;
                          return (
                          <div key={enrollment.id} className="p-3 bg-secondary/30 rounded-md border border-border flex items-center justify-between">
                             <div>
                                <p className="text-sm font-medium">{profile?.full_name || profile?.email}</p>
                                {profile?.full_name && (
                                  <p className="text-xs text-muted-foreground">{profile.email}</p>
                                )}
                             </div>
                             <div className="flex items-center gap-2">
                               <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-1 rounded">
                                  Enrolled {new Date(enrollment.created_at).toLocaleDateString()}
                               </span>
                               <form action={handleUnenroll}>
                                 <input type="hidden" name="enrollmentId" value={enrollment.id} />
                                 <UnenrollButton />
                               </form>
                             </div>
                          </div>
                          );
                       })}
                      {data?.course?.enrollments?.length === 0 && (
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
