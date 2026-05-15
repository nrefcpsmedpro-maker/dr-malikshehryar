import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import TestEngine from '@/components/TestEngine';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { MockResult, MockTestWithQuestions } from '@/types/lms';
import { percentage } from '@/utils/lms';

export default async function StudentTestPage({
  params,
}: {
  params: Promise<{ courseId: string; testId: string }>;
}) {
  const { courseId, testId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: testData, error } = await supabase
    .from('mock_tests')
    .select('id, course_id, title, description, time_limit_minutes, created_at, questions:mock_questions(*)')
    .eq('id', testId)
    .single();

  if (error || !testData) redirect(`/dashboard/courses/${courseId}`);

  const test = testData as unknown as MockTestWithQuestions;

  const { data: resultData } = await supabase
    .from('mock_results')
    .select('*')
    .eq('test_id', testId)
    .eq('user_id', user.id)
    .maybeSingle();

  const result = resultData as MockResult | null;

  if (result) {
    const scorePercent = percentage(result.score, result.total_questions);
    const passing = scorePercent >= 60;

    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
        <Card className="w-full rounded-lg p-8 text-center shadow-sm">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-lg ${passing ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' : 'bg-destructive/10 text-destructive'}`}>
            {passing ? <CheckCircle2 size={34} /> : <XCircle size={34} />}
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">{passing ? 'Test passed' : 'Test completed'}</h1>
          <p className="mt-2 text-muted-foreground">{test.title}</p>

          <div className="mx-auto mt-8 flex h-36 w-36 items-center justify-center rounded-full border-8 border-secondary bg-background">
            <span className={`text-4xl font-semibold ${passing ? 'text-emerald-600 dark:text-emerald-300' : 'text-destructive'}`}>
              {scorePercent}%
            </span>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 text-left">
            <div className="rounded-lg border bg-background p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Score</p>
              <p className="mt-2 text-xl font-semibold">{result.score} / {result.total_questions}</p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Status</p>
              <p className={`mt-2 text-xl font-semibold ${passing ? 'text-emerald-600 dark:text-emerald-300' : 'text-destructive'}`}>
                {passing ? 'Passed' : 'Needs review'}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="secondary">
              <Link href={`/dashboard/courses/${courseId}`}>
                <ArrowLeft size={17} className="mr-2" />
                Back to course
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <TestEngine test={test} courseId={courseId} />;
}
