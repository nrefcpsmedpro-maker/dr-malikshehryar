'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock, Send } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import ExamResults from '@/components/ExamResults';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/lms/ProgressBar';
import { StatusBadge } from '@/components/lms/StatusBadge';
import type { ExamAttemptMode, ExamQuestion, ExamQuestionOrder, ExamResult, ExamTimeMode, SubjectScore } from '@/types/lms';
import { cn } from '@/utils/cn';
import { percentage, sortByOrder } from '@/utils/lms';

type OptionKey = 'A' | 'B' | 'C' | 'D';

type EngineQuestion = ExamQuestion & {
  subjectId: string;
  subjectTitle: string;
  order_index: number;
};

type EngineSubject = {
  id: string;
  title: string;
  order_index: number;
  time_limit_minutes: number | null;
  questions: ExamQuestion[];
};

type ExamData = {
  id: string;
  title: string;
  attempt_mode?: ExamAttemptMode;
  time_mode: ExamTimeMode;
  total_time_minutes: number;
  question_order: ExamQuestionOrder;
  subjects: EngineSubject[];
};

type GroupedSubject = {
  subjectId: string;
  subjectTitle: string;
  timeLimitMinutes: number;
  orderIndex: number;
  questions: EngineQuestion[];
};

const options: OptionKey[] = ['A', 'B', 'C', 'D'];

function shuffleArray<T>(array: T[]) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function optionText(question: ExamQuestion, option: OptionKey) {
  return question[`option_${option.toLowerCase()}` as keyof Pick<ExamQuestion, 'option_a' | 'option_b' | 'option_c' | 'option_d'>];
}

export default function ExamEngine({
  exam,
  resultSubjectId = null,
}: {
  exam: ExamData;
  resultSubjectId?: string | null;
}) {
  const supabase = createClient();
  const sortedSubjects = useMemo(() => sortByOrder(exam.subjects), [exam.subjects]);

  const groupedQuestions = useMemo<GroupedSubject[]>(() => {
    return sortedSubjects
      .map((subject) => ({
        subjectId: subject.id,
        subjectTitle: subject.title,
        orderIndex: subject.order_index,
        timeLimitMinutes: subject.time_limit_minutes || exam.total_time_minutes,
        questions: [...subject.questions]
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((question) => ({
            ...question,
            subjectId: subject.id,
            subjectTitle: subject.title,
            order_index: subject.order_index,
          })),
      }))
      .filter((subject) => subject.questions.length > 0);
  }, [exam.total_time_minutes, sortedSubjects]);

  const orderedQuestions = useMemo(() => {
    const questions = groupedQuestions.flatMap((subject) => subject.questions);
    return exam.question_order === 'mixed' ? shuffleArray(questions) : questions;
  }, [exam.question_order, groupedQuestions]);

  const groupedMode = exam.question_order === 'by_subject';
  const initialSeconds = groupedMode
    ? (groupedQuestions[0]?.timeLimitMinutes ?? exam.total_time_minutes) * 60
    : exam.total_time_minutes * 60;

  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, OptionKey>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<ExamResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(initialSeconds);

  const totalQuestions = orderedQuestions.length;
  const currentQuestion = groupedMode
    ? groupedQuestions[currentSubjectIndex]?.questions[currentQuestionIndex] ?? null
    : orderedQuestions[currentQuestionIndex] ?? null;

  const currentOverallIndex = groupedMode
    ? groupedQuestions.slice(0, currentSubjectIndex).reduce((sum, subject) => sum + subject.questions.length, 0) + currentQuestionIndex
    : currentQuestionIndex;

  const isLastQuestion = currentOverallIndex >= totalQuestions - 1;

  const submitExam = useCallback(async () => {
    if (submitting || submittedResult) return;
    setSubmitting(true);

    const subjectScores: SubjectScore[] = [];
    let totalScore = 0;
    let questionCount = 0;

    for (const subject of sortedSubjects) {
      let score = 0;
      for (const question of subject.questions) {
        questionCount++;
        if (answers[question.id] === question.correct_option) {
          score++;
          totalScore++;
        }
      }

      subjectScores.push({
        subject_id: subject.id,
        subject_title: subject.title,
        score,
        total: subject.questions.length,
        order_index: subject.order_index,
      });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const resultPayload = {
      total_score: totalScore,
      total_questions: questionCount,
      subject_scores: subjectScores,
    };

    if (user) {
      const { data: insertedResult } = await supabase
        .from('exam_results')
        .insert([
          {
            user_id: user.id,
            exam_id: exam.id,
            subject_id: resultSubjectId,
            ...resultPayload,
          },
        ])
        .select('id, total_score, total_questions, subject_scores, created_at')
        .single();

      if (insertedResult) {
        setSubmittedResult(insertedResult as ExamResult);
        setSubmitting(false);
        return;
      }
    }

    setSubmittedResult({
      id: `local-${exam.id}`,
      created_at: new Date().toISOString(),
      ...resultPayload,
    });
    setSubmitting(false);
  }, [answers, exam.id, resultSubjectId, sortedSubjects, submittedResult, submitting, supabase]);

  useEffect(() => {
    if (timeLeft <= 0) {
      const timeout = window.setTimeout(() => {
        void submitExam();
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    const timer = window.setInterval(() => setTimeLeft((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [submitExam, timeLeft]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  };

  const handleSelect = (questionId: string, option: OptionKey) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const goToSubject = (subjectIndex: number) => {
    const target = groupedQuestions[subjectIndex];
    if (!target) return;
    setCurrentSubjectIndex(subjectIndex);
    setCurrentQuestionIndex(0);
    if (exam.time_mode === 'per_subject') {
      setTimeLeft(target.timeLimitMinutes * 60);
    }
  };

  const handleNext = () => {
    if (isLastQuestion) return;

    if (groupedMode) {
      const subject = groupedQuestions[currentSubjectIndex];
      if (currentQuestionIndex < subject.questions.length - 1) {
        setCurrentQuestionIndex((value) => value + 1);
      } else {
        goToSubject(currentSubjectIndex + 1);
      }
      return;
    }

    setCurrentQuestionIndex((value) => value + 1);
  };

  const handlePrevious = () => {
    if (currentOverallIndex === 0) return;

    if (groupedMode) {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex((value) => value - 1);
      } else {
        const previousSubject = groupedQuestions[currentSubjectIndex - 1];
        if (previousSubject) {
          setCurrentSubjectIndex((value) => value - 1);
          setCurrentQuestionIndex(previousSubject.questions.length - 1);
          if (exam.time_mode === 'per_subject') {
            setTimeLeft(previousSubject.timeLimitMinutes * 60);
          }
        }
      }
      return;
    }

    setCurrentQuestionIndex((value) => value - 1);
  };

  const goToQuestion = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= totalQuestions) return;

    if (!groupedMode) {
      setCurrentQuestionIndex(targetIndex);
      return;
    }

    let remaining = targetIndex;
    for (let subjectIndex = 0; subjectIndex < groupedQuestions.length; subjectIndex++) {
      const subject = groupedQuestions[subjectIndex];
      if (remaining < subject.questions.length) {
        setCurrentSubjectIndex(subjectIndex);
        setCurrentQuestionIndex(remaining);
        return;
      }
      remaining -= subject.questions.length;
    }
  };

  if (submittedResult) {
    return <ExamResults result={submittedResult} exam={{ id: exam.id, title: exam.title }} />;
  }

  if (!currentQuestion) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6 text-center">
        <Card className="max-w-md rounded-lg p-8">
          <h1 className="text-2xl font-semibold">No questions available</h1>
          <p className="mt-3 text-muted-foreground">This exam does not have any published questions yet.</p>
        </Card>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const completion = percentage(answeredCount, totalQuestions);
  const currentSubject = groupedMode ? groupedQuestions[currentSubjectIndex] : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="sticky top-4 z-20 rounded-lg p-5 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <StatusBadge variant="purple">Mock exam</StatusBadge>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{exam.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {currentSubject ? `${currentSubject.subjectTitle} - ` : ''}
              Question {currentOverallIndex + 1} of {totalQuestions}
            </p>
          </div>
          <div className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-4 py-3 font-mono text-xl font-semibold',
            timeLeft < 60 ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'bg-secondary text-foreground',
          )}>
            <Clock size={20} />
            {formatTime(timeLeft)}
          </div>
        </div>
        <ProgressBar value={completion} className="mt-5" />
      </Card>

      {groupedMode && (
        <div className="flex flex-wrap gap-2">
          {groupedQuestions.map((subject, index) => (
            <button
              key={subject.subjectId}
              type="button"
              onClick={() => goToSubject(index)}
              className={cn(
                'rounded-lg border px-3 py-2 text-xs font-semibold transition',
                index === currentSubjectIndex ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/40',
              )}
            >
              {subject.subjectTitle}
            </button>
          ))}
        </div>
      )}

      <Card className="rounded-lg p-6 shadow-sm">
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
            {currentOverallIndex + 1}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold leading-7">{currentQuestion.question_text}</h2>
            <div className="mt-5 grid gap-3">
              {options.map((option) => {
                const selected = answers[currentQuestion.id] === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSelect(currentQuestion.id, option)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg border p-4 text-left transition',
                      selected ? 'border-primary bg-primary/10 text-primary' : 'bg-background hover:border-primary/40',
                    )}
                  >
                    {selected ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <Circle size={18} className="mt-0.5 shrink-0 text-muted-foreground" />}
                    <span>
                      <span className="font-semibold">{option}.</span> {optionText(currentQuestion, option)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="secondary" onClick={handlePrevious} disabled={currentOverallIndex === 0}>
          <ChevronLeft size={18} className="mr-2" />
          Previous
        </Button>
        {isLastQuestion ? (
          <Button onClick={submitExam} disabled={submitting} size="lg">
            <Send size={18} className="mr-2" />
            {submitting ? 'Submitting...' : 'Submit exam'}
          </Button>
        ) : (
          <Button onClick={handleNext} size="lg">
            Next
            <ChevronRight size={18} className="ml-2" />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {orderedQuestions.map((question, index) => {
          const current = index === currentOverallIndex;
          const answered = Boolean(answers[question.id]);
          return (
            <button
              key={question.id}
              type="button"
              onClick={() => goToQuestion(index)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md border text-xs font-semibold transition',
                current
                  ? 'border-primary bg-primary text-primary-foreground'
                  : answered
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                    : 'bg-card text-muted-foreground hover:border-primary/40',
              )}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
