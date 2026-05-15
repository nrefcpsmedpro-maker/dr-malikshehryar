import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { UserCheck, UserX, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || profile?.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  return user;
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

  const enrollmentsByUser = new Map<string, Enrollment[]>();

  (enrollments ?? []).forEach((enrollment) => {
    const userEnrollments = enrollmentsByUser.get(enrollment.user_id) ?? [];
    userEnrollments.push(enrollment as unknown as Enrollment);
    enrollmentsByUser.set(enrollment.user_id, userEnrollments);
  });

  // --- SERVER ACTIONS ---

  const toggleApproval = async (formData: FormData) => {
    'use server';

    await requireAdmin();

    const userId = formData.get('userId') as string;
    const isApproved = formData.get('currentStatus') === 'true';
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('profiles')
      .update({ is_approved: !isApproved })
      .eq('id', userId);

    if (error) {
      console.error('Error toggling approval:', error.message);
      throw new Error('Failed to update approval');
    }

    revalidatePath('/admin/users');
  };

  const generateUser = async (formData: FormData) => {
    'use server';

    await requireAdmin();

    const rawEmail = formData.get('email');
    const rawPassword = formData.get('password');
    const rawFullName = formData.get('fullName');
    const rawMobileNumber = formData.get('mobileNumber');
    const rawCnicNumber = formData.get('cnicNumber');
    const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';
    const password = typeof rawPassword === 'string' ? rawPassword : '';
    const fullName = typeof rawFullName === 'string' ? rawFullName.trim() : '';
    const mobileNumber = typeof rawMobileNumber === 'string' ? rawMobileNumber.trim() : '';
    const cnicNumber = typeof rawCnicNumber === 'string' ? rawCnicNumber.trim() : '';

    if (!email || !password || !fullName || !mobileNumber || !cnicNumber) {
      throw new Error('Full name, email, mobile number, CNIC, and password are required');
    }
    
    const adminClient = createAdminClient();
    
    const { data: newUser, error } = await adminClient.auth.admin.createUser({
       email,
       password,
       email_confirm: true,
       user_metadata: {
         full_name: fullName,
         mobile_number: mobileNumber,
         cnic_number: cnicNumber,
       }
    });

    if (error) {
      console.error("Error creating user:", error.message);
      throw new Error('Failed to create user');
    }

    if (newUser.user?.id) {
       const { error: approvalError } = await adminClient
         .from('profiles')
         .update({
           full_name: fullName,
           mobile_number: mobileNumber,
           cnic_number: cnicNumber,
           is_approved: true,
         })
         .eq('id', newUser.user.id);

       if (approvalError) {
         console.error('Error approving generated user:', approvalError.message);
         throw new Error('Failed to approve generated user');
       }
    }

    revalidatePath('/admin/users');
  };

  const enrollUserInCourse = async (formData: FormData) => {
    'use server';

    await requireAdmin();

    const userId = formData.get('userId');
    const courseId = formData.get('courseId');

    if (typeof userId !== 'string' || !userId || typeof courseId !== 'string' || !courseId) {
      throw new Error('Student and course are required');
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const [{ data: student, error: studentError }, { data: course, error: courseError }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, role')
        .eq('id', userId)
        .eq('role', 'student')
        .maybeSingle(),
      supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .maybeSingle(),
    ]);

    if (studentError || !student) {
      throw new Error('Student not found');
    }

    if (courseError || !course) {
      throw new Error('Course not found');
    }

    const { error } = await supabase
      .from('enrollments')
      .insert([{ user_id: student.id, course_id: course.id }]);

    if (error && error.code !== '23505') {
      console.error('Error enrolling student in course:', error.message);
      throw new Error('Failed to enroll student');
    }

    revalidatePath('/admin/users');
    revalidatePath('/admin/courses');
    revalidatePath('/dashboard');
  };

  const unenrollUserFromCourse = async (formData: FormData) => {
    'use server';

    await requireAdmin();

    const userId = formData.get('userId');
    const courseId = formData.get('courseId');

    if (typeof userId !== 'string' || !userId || typeof courseId !== 'string' || !courseId) {
      throw new Error('Student and course are required');
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('user_id', userId)
      .eq('course_id', courseId);

    if (error) {
      console.error('Error removing student from course:', error.message);
      throw new Error('Failed to remove student from course');
    }

    revalidatePath('/admin/users');
    revalidatePath('/admin/courses');
    revalidatePath('/dashboard');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">
          Approve or reject student registrations, and forcefully generate new accounts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFTSIDE: User List & Approvals */}
        <section className="lg:col-span-2 space-y-4">
           {users?.map((user: UserProfile) => {
             const userEnrollments = enrollmentsByUser.get(user.id) ?? [];
             const assignedCourseIds = new Set(userEnrollments.map((enrollment) => enrollment.course_id));
             const availableCourses = (courses ?? []).filter((course) => !assignedCourseIds.has(course.id));

             return (
             <Card key={user.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                   <h4 className="font-bold text-lg">{user.full_name || 'No Name'}</h4>
                   <p className="text-sm text-muted-foreground">{user.email}</p>
                   {(user.mobile_number || user.cnic_number) && (
                     <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                       {user.mobile_number && <p>Mobile: {user.mobile_number}</p>}
                       {user.cnic_number && <p>CNIC: {user.cnic_number}</p>}
                     </div>
                   )}
                   
                   <div className="flex gap-2 mt-2">
                      <span className="text-xs font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                         {user.role}
                      </span>
                      {user.is_approved ? (
                         <span className="text-xs font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">Approved</span>
                      ) : (
                         <span className="text-xs font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-500">Pending</span>
                      )}
                   </div>
                </div>
                
                {user.role !== 'admin' && (
                  <div className="w-full md:w-auto flex flex-col gap-4 md:items-end">
                    <form action={toggleApproval}>
                       <input type="hidden" name="userId" value={user.id} />
                       <input type="hidden" name="currentStatus" value={user.is_approved ? 'true' : 'false'} />
                       
                       {user.is_approved ? (
                          <Button type="submit" variant="outline" className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10">
                             <UserX size={16} className="mr-2" /> Revoke Access
                          </Button>
                       ) : (
                          <Button type="submit" variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                             <UserCheck size={16} className="mr-2" /> Approve Student
                          </Button>
                       )}
                    </form>

                    <div className="w-full md:w-80 rounded-lg border border-border bg-secondary/20 p-3">
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
                          {(courses ?? []).map((course: Course) => {
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
                              <Button type="submit" variant="ghost" size="sm" className="h-auto px-1 py-0 text-[11px] text-destructive hover:text-destructive">
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
           )})}
           {!users?.length && (
              <p className="p-8 text-center text-muted-foreground">No users found.</p>
           )}
        </section>

        {/* RIGHTSIDE: Generate User Form */}
        <section className="space-y-6">
           <Card className="p-6 h-fit sticky top-8">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                 <ShieldAlert className="text-destructive" />
                 Generate Account
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                 Bypass the waiting room. Generate an explicitly approved student account directly.
              </p>
              
              <form action={generateUser} className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</label>
                    <Input type="text" name="fullName" required placeholder="Dr. Sarah" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
                    <Input type="email" name="email" required placeholder="sarah@medpro.com" />
                 </div>
                 <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                       <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mobile Number</label>
                       <Input type="tel" name="mobileNumber" required placeholder="+92 300 0000000" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CNIC Number</label>
                       <Input type="text" inputMode="numeric" name="cnicNumber" required placeholder="35202-1234567-1" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Temporary Password</label>
                    <Input type="password" name="password" required placeholder="••••••••" />
                 </div>
                 
                 <Button type="submit" variant="destructive" className="w-full mt-4">
                    Generate & Approve
                 </Button>
              </form>
           </Card>
        </section>

      </div>
    </div>
  );
}
