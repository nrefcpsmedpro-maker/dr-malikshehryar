import Link from 'next/link';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { Award, Clock, FileQuestion, PlusCircle, Shuffle, Trash2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { EmptyState } from '@/components/lms/EmptyState';
import { PageHeader } from '@/components/lms/PageHeader';
import { StatusBadge } from '@/components/lms/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { MockExamWithSubjects } from '@/types/lms';
import { relationCount } from '@/utils/lms';

export default async function AdminExamsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: examsData } = await supabase
    .from('mock_exams')
    .select('id, title, description, time_mode, total_time_minutes, question_order, attempt_mode, created_at, subjects:exam_subjects(id, title, order_index, time_limit_minutes, questions:exam_questions(count))')
    .order('created_at', { ascending: false });

  const exams = (examsData ?? []) as unknown as MockExamWithSubjects[];

  const addExam = async (formData: FormData) => {
    'use server';
    const title = formData.get('title');
    const description = formData.get('description');
    const timeMode = formData.get('time_mode');
    const totalTime = Number(formData.get('total_time')) || 60;
    const questionOrder = formData.get('question_order');
    const attemptMode = formData.get('attempt_mode');

    if (typeof title !== 'string' || !title.trim()) return;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    await supabase.from('mock_exams').insert([
      {
        title: title.trim(),
        description: typeof description === 'string' ? description : null,
        time_mode: typeof timeMode === 'string' ? timeMode : 'total',
        total_time_minutes: totalTime,
        question_order: typeof questionOrder === 'string' ? questionOrder : 'mixed',
        attempt_mode: typeof attemptMode === 'string' ? attemptMode : 'full_exam',
      },
    ]);
    revalidatePath('/admin/exams');
  };

  const deleteExam = async (formData: FormData) => {
    'use server';
    const examId = formData.get('examId');
    if (typeof examId !== 'string' || !examId) return;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    await supabase.from('mock_exams').delete().eq('id', examId);
    revalidatePath('/admin/exams');
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Standalone exam center"
        title="Mock exams"
        description="Create full or subject-wise medical mock exams independent from course-specific tests."
      />

      <div className="grid gap-5 lg:grid-cols-[24rem_1fr]">
        <Card className="h-fit rounded-lg p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <PlusCircle size={19} className="text-primary" />
            Draft new exam
          </h2>
          <form action={addExam} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Exam title</label>
              <Input name="title" required placeholder="e.g. NRE 1 Mock Exam" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea name="description" rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Comprehensive exam description" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Time mode</label>
                <select name="time_mode" defaultValue="total" className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="total">Total time</option>
                  <option value="per_subject">Per subject</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Minutes</label>
                <Input type="number" name="total_time" required defaultValue="60" min="1" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Question order</label>
              <select name="question_order" defaultValue="mixed" className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="mixed">Mixed and shuffled</option>
                <option value="by_subject">Grouped by subject</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Attempt format</label>
              <select name="attempt_mode" defaultValue="full_exam" className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="full_exam">Full exam</option>
                <option value="subject_wise">Subject-wise start</option>
              </select>
            </div>
            <Button type="submit" className="w-full">Create exam</Button>
          </form>
        </Card>

        <section className="space-y-4">
          {!exams.length ? (
            <EmptyState
              icon={Award}
              title="No standalone exams yet"
              description="Create an exam, add subjects, and then add questions to each subject."
            />
          ) : (
            exams.map((exam) => {
              const totalQuestions = (exam.subjects ?? []).reduce((sum, subject) => sum + relationCount(subject.questions), 0);
              return (
                <Card key={exam.id} className="rounded-lg p-5 shadow-sm">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge variant="info">{exam.time_mode === 'total' ? 'Total timer' : 'Per subject timer'}</StatusBadge>
                        <StatusBadge variant="purple">{exam.question_order === 'mixed' ? 'Mixed' : 'By subject'}</StatusBadge>
                        <StatusBadge>{exam.attempt_mode === 'subject_wise' ? 'Subject-wise' : 'Full exam'}</StatusBadge>
                      </div>
                      <h2 className="mt-3 text-xl font-semibold">{exam.title}</h2>
                      {exam.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{exam.description}</p>}
                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <FileQuestion size={14} />
                          {totalQuestions} questions
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={14} />
                          {exam.total_time_minutes} min
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Shuffle size={14} />
                          {exam.subjects?.length ?? 0} subjects
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild>
                        <Link href={`/admin/exams/${exam.id}/builder`}>
                          Open builder
                        </Link>
                      </Button>
                      <form action={deleteExam}>
                        <input type="hidden" name="examId" value={exam.id} />
                        <Button type="submit" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                          <Trash2 size={18} />
                        </Button>
                      </form>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
