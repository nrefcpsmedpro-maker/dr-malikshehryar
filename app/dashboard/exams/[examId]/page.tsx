import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ArrowLeft, BookOpen, Clock, FileQuestion } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import ExamEngine from '@/components/ExamEngine';
import ExamResults from '@/components/ExamResults';
import { EmptyState } from '@/components/lms/EmptyState';
import { PageHeader } from '@/components/lms/PageHeader';
import { StatusBadge } from '@/components/lms/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ExamQuestion, ExamResult, MockExam } from '@/types/lms';
import { sortByOrder } from '@/utils/lms';

type ExamSubjectForEngine = {
  id: string;
  title: string;
  order_index: number;
  time_limit_minutes: number | null;
  questions: ExamQuestion[];
};

type ExamForEngine = MockExam & {
  subjects: ExamSubjectForEngine[];
};

export default async function StudentExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ subjectId?: string }>;
}) {
  const { examId } = await params;
  const { subjectId } = await searchParams;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: examData, error } = await supabase
    .from('mock_exams')
    .select('id, title, description, time_mode, total_time_minutes, question_order, attempt_mode, created_at, subjects:exam_subjects(id, title, order_index, time_limit_minutes, questions:exam_questions(id, question_text, option_a, option_b, option_c, option_d, correct_option, created_at))')
    .eq('id', examId)
    .single();

  if (error || !examData) redirect('/dashboard/exams');

  const exam = examData as unknown as ExamForEngine;
  const sortedSubjects = sortByOrder(exam.subjects);
  const subjectsWithQuestions = sortedSubjects.filter((subject) => subject.questions.length > 0);
  const isFullExamAttempt = !subjectId || subjectId === 'full';
  const selectedSubject = subjectId ? sortedSubjects.find((subject) => subject.id === subjectId) ?? null : null;

  if (exam.attempt_mode === 'subject_wise' && !isFullExamAttempt && !selectedSubject) {
    redirect(`/dashboard/exams/${exam.id}`);
  }

  if (exam.attempt_mode === 'subject_wise' && !subjectId) {
    return (
      <div className="space-y-8">
        <Link href="/dashboard/exams" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} />
          Back to exams
        </Link>
        <PageHeader
          eyebrow="Subject-wise exam"
          title={exam.title}
          description="Choose a subject for a focused attempt, or start the full exam."
        />

        {subjectsWithQuestions.length === 0 ? (
          <EmptyState
            icon={FileQuestion}
            title="No subjects with questions"
            description="This exam is published, but questions have not been added yet."
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {subjectsWithQuestions.map((subject) => (
              <Card key={subject.id} className="rounded-lg p-6 shadow-sm">
                <StatusBadge variant="purple">Subject</StatusBadge>
                <h2 className="mt-4 text-xl font-semibold">{subject.title}</h2>
                <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen size={14} />
                    Subject
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <FileQuestion size={14} />
                    {subject.questions.length} questions
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={14} />
                    {subject.time_limit_minutes || exam.total_time_minutes} min
                  </span>
                </div>
                <Button asChild className="mt-6 w-full">
                  <Link href={`/dashboard/exams/${exam.id}?subjectId=${subject.id}`}>
                    Start {subject.title}
                  </Link>
                </Button>
              </Card>
            ))}
          </div>
        )}

        <Card className="rounded-lg p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Full exam mode</h2>
              <p className="mt-1 text-sm text-muted-foreground">Take all available subjects in one attempt.</p>
            </div>
            <Button asChild variant="secondary">
              <Link href={`/dashboard/exams/${exam.id}?subjectId=full`}>
                Start full exam
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const scopedExam: ExamForEngine =
    exam.attempt_mode === 'subject_wise' && selectedSubject && !isFullExamAttempt
      ? {
          ...exam,
          subjects: [selectedSubject],
          title: `${exam.title} - ${selectedSubject.title}`,
        }
      : {
          ...exam,
          subjects: sortedSubjects,
        };

  const resultQuery = supabase
    .from('exam_results')
    .select('id, user_id, exam_id, subject_id, total_score, total_questions, subject_scores, created_at')
    .eq('exam_id', examId)
    .eq('user_id', user.id);

  if (exam.attempt_mode === 'subject_wise' && selectedSubject && !isFullExamAttempt) {
    resultQuery.eq('subject_id', selectedSubject.id);
  } else {
    resultQuery.is('subject_id', null);
  }

  const { data: resultData } = await resultQuery.order('created_at', { ascending: false }).limit(1).maybeSingle();
  const result = resultData as unknown as ExamResult | null;

  if (result) {
    return (
      <ExamResults
        result={result}
        exam={{
          id: exam.id,
          title: scopedExam.title,
        }}
      />
    );
  }

  return <ExamEngine exam={scopedExam} resultSubjectId={exam.attempt_mode === 'subject_wise' && selectedSubject && !isFullExamAttempt ? selectedSubject.id : null} />;
}
