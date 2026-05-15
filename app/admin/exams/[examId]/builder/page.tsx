import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ArrowLeft, BookOpen, Clock, Edit2, PlusCircle, Trash2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { EmptyState } from '@/components/lms/EmptyState';
import { PageHeader } from '@/components/lms/PageHeader';
import { StatusBadge } from '@/components/lms/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { ExamQuestion, MockExam } from '@/types/lms';
import { sortByOrder } from '@/utils/lms';

type BuilderSubject = {
  id: string;
  title: string;
  order_index: number;
  time_limit_minutes: number | null;
  questions: ExamQuestion[] | null;
};

type BuilderExam = MockExam & {
  subjects: BuilderSubject[] | null;
};

export default async function ExamBuilderPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: examData, error } = await supabase
    .from('mock_exams')
    .select('id, title, description, time_mode, total_time_minutes, question_order, attempt_mode, created_at, subjects:exam_subjects(id, title, order_index, time_limit_minutes, questions:exam_questions(id, question_text, option_a, option_b, option_c, option_d, correct_option, created_at))')
    .eq('id', examId)
    .single();

  if (error || !examData) redirect('/admin/exams');

  const exam = examData as unknown as BuilderExam;
  const sortedSubjects = sortByOrder(exam.subjects);

  const addSubject = async (formData: FormData) => {
    'use server';
    const title = formData.get('title');
    const timeLimitValue = formData.get('time_limit');

    if (typeof title !== 'string' || !title.trim()) return;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: currentSubjects } = await supabase.from('exam_subjects').select('order_index').eq('exam_id', examId);
    const maxOrder = Math.max(-1, ...((currentSubjects ?? []) as Array<{ order_index: number }>).map((subject) => subject.order_index));

    await supabase.from('exam_subjects').insert([
      {
        exam_id: examId,
        title: title.trim(),
        order_index: maxOrder + 1,
        time_limit_minutes: typeof timeLimitValue === 'string' && timeLimitValue ? Number(timeLimitValue) : null,
      },
    ]);
    revalidatePath(`/admin/exams/${examId}/builder`);
  };

  const deleteSubject = async (formData: FormData) => {
    'use server';
    const subjectId = formData.get('subjectId');
    if (typeof subjectId !== 'string' || !subjectId) return;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    await supabase.from('exam_subjects').delete().eq('id', subjectId);
    revalidatePath(`/admin/exams/${examId}/builder`);
  };

  const updateExamSettings = async (formData: FormData) => {
    'use server';
    const title = formData.get('title');
    if (typeof title !== 'string' || !title.trim()) return;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    await supabase
      .from('mock_exams')
      .update({
        title: title.trim(),
        description: formData.get('description'),
        time_mode: formData.get('time_mode'),
        total_time_minutes: Number(formData.get('total_time')) || 60,
        question_order: formData.get('question_order'),
        attempt_mode: formData.get('attempt_mode'),
      })
      .eq('id', examId);
    revalidatePath(`/admin/exams/${examId}/builder`);
  };

  return (
    <div className="space-y-8">
      <Link href="/admin/exams" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} />
        Back to exams
      </Link>

      <PageHeader
        eyebrow="Exam builder"
        title={exam.title}
        description="Manage exam settings, subjects, timing, and question banks."
      />

      <div className="grid gap-5 lg:grid-cols-[24rem_1fr]">
        <aside className="space-y-5">
          <Card className="rounded-lg p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Edit2 size={18} className="text-primary" />
              Exam settings
            </h2>
            <form action={updateExamSettings} className="mt-5 space-y-4">
              <Input name="title" required defaultValue={exam.title} />
              <textarea name="description" rows={3} defaultValue={exam.description || ''} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
              <div className="grid gap-3 sm:grid-cols-2">
                <select name="time_mode" required defaultValue={exam.time_mode} className="h-10 rounded-md border bg-background px-3 text-sm">
                  <option value="total">Total time</option>
                  <option value="per_subject">Per subject</option>
                </select>
                <Input type="number" name="total_time" required defaultValue={exam.total_time_minutes} min="1" />
              </div>
              <select name="question_order" required defaultValue={exam.question_order} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="mixed">Mixed questions</option>
                <option value="by_subject">By subject</option>
              </select>
              <select name="attempt_mode" required defaultValue={exam.attempt_mode || 'full_exam'} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="full_exam">Full exam</option>
                <option value="subject_wise">Subject-wise start</option>
              </select>
              <Button type="submit" variant="secondary" className="w-full">Save settings</Button>
            </form>
          </Card>

          <Card className="rounded-lg p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <PlusCircle size={18} className="text-primary" />
              Add subject
            </h2>
            <form action={addSubject} className="mt-5 space-y-3">
              <Input name="title" required placeholder="e.g. Anatomy" />
              {exam.time_mode === 'per_subject' && (
                <Input type="number" name="time_limit" min="1" placeholder="Time limit in minutes" />
              )}
              <Button type="submit" className="w-full">Add subject</Button>
            </form>
          </Card>
        </aside>

        <section className="space-y-4">
          {!sortedSubjects.length ? (
            <EmptyState
              icon={BookOpen}
              title="No subjects added"
              description="Add a subject to begin building this standalone mock exam."
            />
          ) : (
            sortedSubjects.map((subject, index) => (
              <Card key={subject.id} className="rounded-lg p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge variant="purple">Subject {index + 1}</StatusBadge>
                      {exam.time_mode === 'per_subject' && subject.time_limit_minutes && (
                        <StatusBadge variant="info">
                          <Clock size={13} className="mr-1" />
                          {subject.time_limit_minutes} min
                        </StatusBadge>
                      )}
                    </div>
                    <h2 className="mt-3 text-xl font-semibold">{subject.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{subject.questions?.length ?? 0} questions</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild>
                      <Link href={`/admin/exams/${examId}/subjects/${subject.id}`}>Manage questions</Link>
                    </Button>
                    <form action={deleteSubject}>
                      <input type="hidden" name="subjectId" value={subject.id} />
                      <Button type="submit" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                        <Trash2 size={17} />
                      </Button>
                    </form>
                  </div>
                </div>
                {(subject.questions?.length ?? 0) > 0 && (
                  <div className="mt-5 space-y-2 border-t pt-4">
                    {subject.questions?.slice(0, 3).map((question, questionIndex) => (
                      <div key={question.id} className="flex items-start gap-2 rounded-lg border bg-background p-3 text-sm">
                        <span className="font-semibold text-primary">{questionIndex + 1}.</span>
                        <span className="line-clamp-1 flex-1">{question.question_text}</span>
                        <StatusBadge variant="success">{question.correct_option}</StatusBadge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
