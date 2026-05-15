import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Award, BookOpen, Clock, FileQuestion } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { EmptyState } from '@/components/lms/EmptyState';
import { PageHeader } from '@/components/lms/PageHeader';
import { ProgressBar } from '@/components/lms/ProgressBar';
import { StatusBadge } from '@/components/lms/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ExamResult, MockExamWithSubjects } from '@/types/lms';
import { percentage, relationCount } from '@/utils/lms';

export default async function StudentExamsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [{ data: examsData }, { data: resultsData }] = await Promise.all([
    supabase
      .from('mock_exams')
      .select('id, title, description, time_mode, total_time_minutes, question_order, attempt_mode, created_at, subjects:exam_subjects(id, title, order_index, time_limit_minutes, questions:exam_questions(count))')
      .order('created_at', { ascending: false }),
    supabase
      .from('exam_results')
      .select('id, user_id, exam_id, subject_id, total_score, total_questions, subject_scores, created_at')
      .is('subject_id', null)
      .eq('user_id', user.id),
  ]);

  const exams = (examsData ?? []) as unknown as MockExamWithSubjects[];
  const results = (resultsData ?? []) as unknown as ExamResult[];
  const resultsByExam = new Map(results.map((result) => [result.exam_id, result]));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Exam center"
        title="Mock exams"
        description="Practice full medical exams, subject-wise attempts, timed sections, and score review."
      />

      {!exams.length ? (
        <EmptyState
          icon={FileQuestion}
          title="No exams available"
          description="Standalone mock exams will appear here once an administrator publishes them."
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {exams.map((exam) => {
            const totalQuestions = (exam.subjects ?? []).reduce((sum, subject) => sum + relationCount(subject.questions), 0);
            const result = resultsByExam.get(exam.id);
            const score = result ? percentage(result.total_score, result.total_questions) : null;

            return (
              <Card key={exam.id} className="flex flex-col rounded-lg p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-300">
                    <Award size={22} />
                  </div>
                  {score === null ? (
                    <StatusBadge variant="info">Ready</StatusBadge>
                  ) : (
                    <StatusBadge variant={score >= 60 ? 'success' : 'danger'}>{score}%</StatusBadge>
                  )}
                </div>
                <h2 className="mt-5 text-xl font-semibold tracking-tight">{exam.title}</h2>
                {exam.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{exam.description}</p>}
                <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen size={14} />
                    {exam.subjects?.length ?? 0} subjects
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <FileQuestion size={14} />
                    {totalQuestions} questions
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={14} />
                    {exam.total_time_minutes} min
                  </span>
                </div>
                {score !== null && (
                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span>Latest score</span>
                      <span>{score}%</span>
                    </div>
                    <ProgressBar value={score} />
                  </div>
                )}
                <div className="mt-auto pt-6">
                  <Button asChild className="w-full" variant={score === null ? 'default' : 'secondary'}>
                    <Link href={`/dashboard/exams/${exam.id}`}>
                      {score === null ? 'Begin exam' : 'Review or retake'}
                    </Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
