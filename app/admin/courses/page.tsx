import Link from 'next/link';
import { cookies } from 'next/headers';
import { BarChart3, BookOpen, Pencil, Trash2, Users } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { deleteCourseAction } from '@/app/admin/courses/actions';
import { CreateCourseDialog } from '@/components/CreateCourseDialog';
import { EditCourseDialog } from '@/components/EditCourseDialog';
import { ManageCurriculumDialog } from '@/components/ManageCurriculumDialog';
import { ManageStudentsDialog } from '@/components/ManageStudentsDialog';
import { ManageTestsDialog } from '@/components/ManageTestsDialog';
import { CourseVisual } from '@/components/lms/CourseVisual';
import { EmptyState } from '@/components/lms/EmptyState';
import { PageHeader } from '@/components/lms/PageHeader';
import { StatusBadge } from '@/components/lms/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { CourseWithCounts } from '@/types/lms';
import { relationCount } from '@/utils/lms';

export default async function AdminCoursesPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: coursesData, error } = await supabase
    .from('courses')
    .select('id, title, description, thumbnail_url, created_at, lessons(count), enrollments(count)')
    .order('created_at', { ascending: false });

  const courses = (coursesData ?? []) as unknown as CourseWithCounts[];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Content management"
        title="Courses"
        description="Manage academy courses, curriculum blocks, enrollments, and course-level assessments."
        actions={<CreateCourseDialog />}
      />

      {!courses.length && !error ? (
        <EmptyState
          icon={BookOpen}
          title="No courses found"
          description="Create your first course, then add curriculum blocks, lessons, students, and tests."
          action={<CreateCourseDialog />}
        />
      ) : (
        <div className="grid gap-5">
          {courses.map((course) => {
            const lessonCount = relationCount(course.lessons);
            const studentCount = relationCount(course.enrollments);

            return (
              <Card key={course.id} className="overflow-hidden rounded-lg p-0 shadow-sm">
                <div className="grid gap-0 lg:grid-cols-[18rem_1fr]">
                  <CourseVisual title={course.title} src={course.thumbnail_url} className="min-h-56 rounded-none lg:min-h-full" />
                  <div className="p-5">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge variant="info">Course</StatusBadge>
                          <span className="text-xs text-muted-foreground">Created {new Date(course.created_at).toLocaleDateString()}</span>
                        </div>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight">{course.title}</h2>
                        <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                          {course.description || 'No description provided yet.'}
                        </p>
                        <div className="mt-5 flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1">
                            <BookOpen size={15} />
                            {lessonCount} lessons
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1">
                            <Users size={15} />
                            {studentCount} students
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        <Button asChild>
                          <Link href={`/admin/courses/${course.id}/builder`}>
                            <Pencil size={16} className="mr-2" />
                            Builder
                          </Link>
                        </Button>
                        <ManageCurriculumDialog courseId={course.id} courseTitle={course.title} />
                        <ManageStudentsDialog courseId={course.id} courseTitle={course.title} />
                        <ManageTestsDialog courseId={course.id} courseTitle={course.title} />
                        <EditCourseDialog course={course} />
                        <form action={deleteCourseAction}>
                          <input type="hidden" name="courseId" value={course.id} />
                          <Button type="submit" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                            <Trash2 size={17} />
                          </Button>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="rounded-lg p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Need performance details?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Review course, lead, progress, and certificate metrics in analytics.</p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/admin/analytics">
              <BarChart3 size={17} className="mr-2" />
              Open analytics
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
