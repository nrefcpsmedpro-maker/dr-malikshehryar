import { cookies } from 'next/headers';
import { UserCheck, UserX } from 'lucide-react';

import { StudentAccountDialog } from '@/components/admin/StudentAccountDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/server';

import {
  enrollUserInCourse,
  toggleApproval,
  unenrollUserFromCourse,
} from './actions';

type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  mobile_number: string | null;
  cnic_number: string | null;
  role: 'admin' | 'student';
  is_approved: boolean;
  created_at: string;
};

type Course = {
  id: string;
  title: string;
};

type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  courses: Course | null;
};

function formatCnic(value: string | null) {
  const digits = value?.replace(/\D/g, '') ?? '';

  if (digits.length !== 13) {
    return value;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export default async function AdminUsersPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [{ data: users }, { data: courses }, { data: enrollments }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name, mobile_number, cnic_number, role, is_approved, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('courses')
      .select('id, title')
      .order('title', { ascending: true }),
    supabase
      .from('enrollments')
      .select('id, user_id, course_id, courses(id, title)')
      .order('created_at', { ascending: false }),
  ]);

  const userList = (users ?? []) as UserProfile[];
  const courseList = (courses ?? []) as Course[];
  const enrollmentList = (enrollments ?? []) as unknown as Enrollment[];
  const enrollmentsByUser = new Map<string, Enrollment[]>();

  enrollmentList.forEach((enrollment) => {
    const userEnrollments = enrollmentsByUser.get(enrollment.user_id) ?? [];
    userEnrollments.push(enrollment);
    enrollmentsByUser.set(enrollment.user_id, userEnrollments);
  });

  return (
    <div className="mx-auto max-w-7xl animate-in space-y-8 fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Approve registrations, create approved accounts, bulk import students, and manage course access.
          </p>
        </div>
        <StudentAccountDialog courses={courseList} />
      </div>

      <div>
        <section className="space-y-4">
          {userList.map((user) => {
            const userEnrollments = enrollmentsByUser.get(user.id) ?? [];
            const assignedCourseIds = new Set(userEnrollments.map((enrollment) => enrollment.course_id));
            const availableCourses = courseList.filter((course) => !assignedCourseIds.has(course.id));

            return (
              <Card
                key={user.id}
                className="flex flex-col items-start justify-between gap-4 p-5 md:flex-row md:items-center"
              >
                <div>
                  <h4 className="text-lg font-bold">{user.full_name || 'No Name'}</h4>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  {(user.mobile_number || user.cnic_number) && (
                    <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                      {user.mobile_number && <p>Mobile: {user.mobile_number}</p>}
                      {user.cnic_number && <p>CNIC: {formatCnic(user.cnic_number)}</p>}
                    </div>
                  )}

                  <div className="mt-2 flex gap-2">
                    <span className="rounded bg-secondary px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-secondary-foreground">
                      {user.role}
                    </span>
                    {user.is_approved ? (
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-500">
                        Approved
                      </span>
                    ) : (
                      <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-500">
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                {user.role !== 'admin' && (
                  <div className="flex w-full flex-col gap-4 md:w-auto md:items-end">
                    <form action={toggleApproval}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="currentStatus" value={user.is_approved ? 'true' : 'false'} />

                      {user.is_approved ? (
                        <Button
                          type="submit"
                          variant="outline"
                          className="text-amber-500 hover:bg-amber-500/10 hover:text-amber-400"
                        >
                          <UserX size={16} className="mr-2" />
                          Revoke Access
                        </Button>
                      ) : (
                        <Button type="submit" variant="default" className="bg-emerald-600 text-white hover:bg-emerald-700">
                          <UserCheck size={16} className="mr-2" />
                          Approve Student
                        </Button>
                      )}
                    </form>

                    <div className="w-full rounded-lg border border-border bg-secondary/20 p-3 md:w-80">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Course Access</p>
                      <form action={enrollUserInCourse} className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <input type="hidden" name="userId" value={user.id} />
                        <select
                          name="courseId"
                          required
                          defaultValue=""
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="" disabled>
                            Select a course
                          </option>
                          {courseList.map((course) => {
                            const alreadyAssigned = assignedCourseIds.has(course.id);

                            return (
                              <option key={course.id} value={course.id} disabled={alreadyAssigned}>
                                {alreadyAssigned ? `${course.title} (Already assigned)` : course.title}
                              </option>
                            );
                          })}
                        </select>
                        <Button
                          type="submit"
                          variant="secondary"
                          className="sm:w-auto"
                          disabled={availableCourses.length === 0}
                        >
                          Enroll
                        </Button>
                      </form>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {userEnrollments.length > 0 ? (
                          userEnrollments.map((enrollment) => (
                            <form
                              key={enrollment.id}
                              action={unenrollUserFromCourse}
                              className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
                            >
                              <input type="hidden" name="userId" value={user.id} />
                              <input type="hidden" name="courseId" value={enrollment.course_id} />
                              <span>{enrollment.courses?.title ?? 'Untitled Course'}</span>
                              <Button
                                type="submit"
                                variant="ghost"
                                size="sm"
                                className="h-auto px-1 py-0 text-[11px] text-destructive hover:text-destructive"
                              >
                                Remove
                              </Button>
                            </form>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">No courses assigned yet.</p>
                        )}
                      </div>

                      {availableCourses.length === 0 && userEnrollments.length > 0 && (
                        <p className="mt-3 text-[11px] text-muted-foreground">
                          This student already has access to every available course.
                        </p>
                      )}

                      {!user.is_approved && (
                        <p className="mt-3 text-[11px] text-muted-foreground">
                          This student can be pre-enrolled now, but access stays blocked until approval.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}

          {userList.length === 0 && (
            <p className="p-8 text-center text-muted-foreground">No users found.</p>
          )}
        </section>

      </div>
    </div>
  );
}
