import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ArrowLeft, HelpCircle, PlusCircle, Trash2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { EmptyState } from '@/components/lms/EmptyState';
import { PageHeader } from '@/components/lms/PageHeader';
import { StatusBadge } from '@/components/lms/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ExamQuestion } from '@/types/lms';

type SubjectBuilderData = {
  id: string;
  title: string;
  exam: { title: string } | null;
  questions: ExamQuestion[] | null;
};

export default async function SubjectBuilderPage({
  params,
}: {
  params: Promise<{ examId: string; subjectId: string }>;
}) {
  const { examId, subjectId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: subjectData, error } = await supabase
    .from('exam_subjects')
    .select('id, title, exam:mock_exams(title), questions:exam_questions(*)')
    .eq('id', subjectId)
    .single();

  if (error || !subjectData) redirect(`/admin/exams/${examId}/builder`);

  const subject = subjectData as unknown as SubjectBuilderData;
  const sortedQuestions = [...(subject.questions ?? [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const addQuestion = async (formData: FormData) => {
    'use server';
    const questionText = formData.get('question_text');
    if (typeof questionText !== 'string' || !questionText.trim()) return;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    await supabase.from('exam_questions').insert([
      {
        subject_id: subjectId,
        question_text: questionText.trim(),
        option_a: formData.get('option_a'),
        option_b: formData.get('option_b'),
        option_c: formData.get('option_c'),
        option_d: formData.get('option_d'),
        correct_option: formData.get('correct_option'),
      },
    ]);
    revalidatePath(`/admin/exams/${examId}/subjects/${subjectId}`);
  };

  const deleteQuestion = async (formData: FormData) => {
    'use server';
    const questionId = formData.get('questionId');
    if (typeof questionId !== 'string' || !questionId) return;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    await supabase.from('exam_questions').delete().eq('id', questionId);
    revalidatePath(`/admin/exams/${examId}/subjects/${subjectId}`);
  };

  return (
    <div className="space-y-8">
      <Link href={`/admin/exams/${examId}/builder`} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} />
        Back to {subject.exam?.title ?? 'exam'} builder
      </Link>

      <PageHeader
        eyebrow="Question builder"
        title={subject.title}
        description="Create multiple-choice questions and mark the correct answer for this subject."
      />

      <div className="grid gap-5 lg:grid-cols-[24rem_1fr]">
        <Card className="h-fit rounded-lg p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <PlusCircle size={19} className="text-primary" />
            New question
          </h2>
          <form action={addQuestion} className="mt-5 space-y-4">
            <textarea name="question_text" required rows={4} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Question text" />
            {(['A', 'B', 'C', 'D'] as const).map((option) => (
              <div key={option} className="space-y-2">
                <label className="text-sm font-medium">Option {option}</label>
                <input name={`option_${option.toLowerCase()}`} required className="h-10 w-full rounded-md border bg-background px-3 text-sm" />
              </div>
            ))}
            <div className="space-y-2">
              <label className="text-sm font-medium">Correct answer</label>
              <select name="correct_option" required className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
              </select>
            </div>
            <Button type="submit" className="w-full">Save question</Button>
          </form>
        </Card>

        <section className="space-y-4">
          {!sortedQuestions.length ? (
            <EmptyState
              icon={HelpCircle}
              title="No questions yet"
              description="Add the first question for this subject using the form."
            />
          ) : (
            sortedQuestions.map((question, index) => (
              <Card key={question.id} className="rounded-lg p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg font-semibold leading-7">
                    <span className="text-primary">Q{index + 1}.</span> {question.question_text}
                  </h2>
                  <form action={deleteQuestion}>
                    <input type="hidden" name="questionId" value={question.id} />
                    <Button type="submit" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                      <Trash2 size={17} />
                    </Button>
                  </form>
                </div>
                <div className="mt-4 grid gap-2">
                  {(['A', 'B', 'C', 'D'] as const).map((option) => {
                    const text = question[`option_${option.toLowerCase()}` as keyof Pick<ExamQuestion, 'option_a' | 'option_b' | 'option_c' | 'option_d'>];
                    const correct = question.correct_option === option;
                    return (
                      <div key={option} className={`rounded-lg border p-3 text-sm ${correct ? 'border-emerald-500/30 bg-emerald-500/10' : 'bg-background'}`}>
                        <span className="font-semibold">{option}.</span> {text}
                        {correct && <StatusBadge variant="success" className="ml-3">Correct</StatusBadge>}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
