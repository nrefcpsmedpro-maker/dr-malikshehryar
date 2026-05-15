'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Clock3, Circle, Send } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/lms/ProgressBar';
import { StatusBadge } from '@/components/lms/StatusBadge';
import type { MockQuestion, MockTestWithQuestions } from '@/types/lms';
import { cn } from '@/utils/cn';
import { percentage } from '@/utils/lms';

type OptionKey = 'A' | 'B' | 'C' | 'D';

const options: OptionKey[] = ['A', 'B', 'C', 'D'];

function optionText(question: MockQuestion, option: OptionKey) {
  return question[`option_${option.toLowerCase()}` as keyof Pick<MockQuestion, 'option_a' | 'option_b' | 'option_c' | 'option_d'>];
}

export default function TestEngine({
  test,
  courseId,
}: {
  test: MockTestWithQuestions;
  courseId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const questions = useMemo(
    () => [...(test.questions ?? [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [test.questions],
  );
  const [answers, setAnswers] = useState<Record<string, OptionKey>>({});
  const [timeLeft, setTimeLeft] = useState(test.time_limit_minutes * 60);
  const [submitting, setSubmitting] = useState(false);

  const handleSelect = (questionId: string, option: OptionKey) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);

    const score = questions.reduce((sum, question) => (answers[question.id] === question.correct_option ? sum + 1 : sum), 0);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from('mock_results').insert([
        {
          user_id: user.id,
          test_id: test.id,
          score,
          total_questions: questions.length,
        },
      ]);
    }

    router.refresh();
  }, [answers, questions, router, submitting, supabase, test.id]);

  useEffect(() => {
    if (timeLeft <= 0) {
      const timeout = window.setTimeout(() => {
        void handleSubmit();
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    const timer = window.setInterval(() => setTimeLeft((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [handleSubmit, timeLeft]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const completion = percentage(answeredCount, questions.length);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href={`/dashboard/courses/${courseId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} />
        Back to course
      </Link>

      <Card className="sticky top-4 z-20 rounded-lg p-5 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <StatusBadge variant="info">Course test</StatusBadge>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{test.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {answeredCount} of {questions.length} answered
            </p>
          </div>
          <div className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-4 py-3 font-mono text-xl font-semibold',
            timeLeft < 60 ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'bg-secondary text-foreground',
          )}>
            <Clock3 size={20} />
            {formatTime(timeLeft)}
          </div>
        </div>
        <ProgressBar value={completion} className="mt-5" />
      </Card>

      <div className="space-y-5">
        {questions.map((question, index) => (
          <Card key={question.id} className="rounded-lg p-6 shadow-sm">
            <div className="flex gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold leading-7">{question.question_text}</h2>
                <div className="mt-5 grid gap-3">
                  {options.map((option) => {
                    const selected = answers[question.id] === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleSelect(question.id, option)}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-lg border p-4 text-left transition',
                          selected ? 'border-primary bg-primary/10 text-primary' : 'bg-background hover:border-primary/40',
                        )}
                      >
                        {selected ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <Circle size={18} className="mt-0.5 shrink-0 text-muted-foreground" />}
                        <span>
                          <span className="font-semibold">{option}.</span> {optionText(question, option)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting || questions.length === 0} size="lg">
          <Send size={18} className="mr-2" />
          {submitting ? 'Submitting...' : 'Submit answers'}
        </Button>
      </div>
    </div>
  );
}
