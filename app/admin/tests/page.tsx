import Link from 'next/link';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { FileQuestion, PlusCircle, Trash2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { EmptyState } from '@/components/lms/EmptyState';
import { PageHeader } from '@/components/lms/PageHeader';
import { StatusBadge } from '@/components/lms/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { Course, MockTest } from '@/types/lms';

type TestWithCourse = MockTest & {
  course: Pick<Course, 'title'> | null;
};

export default async function AdminTestsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [{ data: testsData }, { data: coursesData }] = await Promise.all([
    supabase.from('mock_tests').select('id, course_id, title, description, time_limit_minutes, created_at, course:courses(title)').order('created_at', { ascending: false }),
    supabase.from('courses').select('id, title, description, thumbnail_url, created_at').order('created_at', { ascending: false }),
  ]);

  const tests = (testsData ?? []) as unknown as TestWithCourse[];
  const courses = (coursesData ?? []) as Course[];

  const addTest = async (formData: FormData) => {
    'use server';
    const courseId = formData.get('course_id');
    const title = formData.get('title');
    const timeLimit = Number(formData.get('time_limit')) || 30;

    if (typeof courseId !== 'string' || !courseId || typeof title !== 'string' || !title.trim()) return;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    await supabase.from('mock_tests').insert([{ course_id: courseId, title: title.trim(), time_limit_minutes: timeLimit }]);
    revalidatePath('/admin/tests');
  };

  const deleteTest = async (formData: FormData) => {
    'use server';
    const testId = formData.get('testId');
    if (typeof testId !== 'string' || !testId) return;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    await supabase.from('mock_tests').delete().eq('id', testId);
    revalidatePath('/admin/tests');
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Assessment management"
        title="Course tests"
        description="Create and maintain timed tests that belong to specific courses."
      />

      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        <Card className="h-fit rounded-lg p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <PlusCircle size={19} className="text-primary" />
            Draft new test
          </h2>
          <form action={addTest} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign to course</label>
              <select name="course_id" required className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Test title</label>
              <Input name="title" required placeholder="e.g. Finals prep" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Time limit</label>
              <Input type="number" name="time_limit" required defaultValue="30" min="1" />
            </div>
            <Button type="submit" disabled={!courses.length} className="w-full">
              {courses.length ? 'Create test' : 'Create a course first'}
            </Button>
          </form>
        </Card>

        <section className="space-y-4">
          {!tests.length ? (
            <EmptyState
              icon={FileQuestion}
              title="No course tests yet"
              description="Create a test, then open the builder to add multiple-choice questions."
            />
          ) : (
            tests.map((test) => (
              <Card key={test.id} className="rounded-lg p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <StatusBadge variant="info">{test.course?.title || 'Unknown course'}</StatusBadge>
                    <h2 className="mt-3 text-xl font-semibold">{test.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{test.time_limit_minutes} minute limit</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="secondary">
                      <Link href={`/admin/courses/${test.course_id}/tests/${test.id}`}>
                        Open builder
                      </Link>
                    </Button>
                    <form action={deleteTest}>
                      <input type="hidden" name="testId" value={test.id} />
                      <Button type="submit" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                        <Trash2 size={18} />
                      </Button>
                    </form>
                  </div>
                </div>
              </Card>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
