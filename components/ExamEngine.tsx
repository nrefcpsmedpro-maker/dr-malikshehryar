'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Clock, ChevronRight, ChevronLeft } from 'lucide-react';
import ExamResults from '@/components/ExamResults';

interface ExamQuestion {
    id: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: string;
    created_at: string;
    subjectId?: string;
    subjectTitle?: string;
}

interface ExamSubject {
    id: string;
    title: string;
    order_index: number;
    time_limit_minutes: number | null;
    questions: ExamQuestion[];
}

interface GroupedSubject {
    subjectId: string;
    subjectTitle: string;
    timeLimitMinutes: number;
    questions: ExamQuestion[];
}

interface ClientExamResult {
    id: string;
    total_score: number;
    total_questions: number;
    subject_scores: Array<{
        subject_id: string;
        subject_title: string;
        score: number;
        total: number;
        order_index: number;
    }>;
    created_at: string;
}

interface ExamData {
    id: string;
    title: string;
    attempt_mode?: 'full_exam' | 'subject_wise';
    time_mode: 'total' | 'per_subject';
    total_time_minutes: number;
    question_order: 'mixed' | 'by_subject';
    subjects: ExamSubject[];
}

interface ExamEngineProps {
    exam: ExamData;
    resultSubjectId?: string | null;
}

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function getOptionText(question: ExamQuestion, option: string): string {
    const key = `option_${option.toLowerCase()}` as keyof ExamQuestion;
    return question[key] as string;
}

export default function ExamEngine({ exam, resultSubjectId = null }: ExamEngineProps) {
    const supabase = createClient();

    const sortedSubjects = [...exam.subjects].sort((a, b) => a.order_index - b.order_index);

    const allQuestions: ExamQuestion[] = sortedSubjects.flatMap(subject =>
        subject.questions.map(q => ({ ...q, subjectId: subject.id, subjectTitle: subject.title }))
    );

    const shuffledQuestions = exam.question_order === 'mixed' ? shuffleArray(allQuestions) : allQuestions;

    const groupedQuestions: GroupedSubject[] | null = exam.question_order === 'by_subject'
        ? sortedSubjects
            .map(subject => ({
                subjectId: subject.id,
                subjectTitle: subject.title,
                timeLimitMinutes: subject.time_limit_minutes || exam.total_time_minutes,
                questions: [...subject.questions].sort((a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                )
            }))
            .filter(subject => subject.questions.length > 0)
        : null;

    const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [submittedResult, setSubmittedResult] = useState<ClientExamResult | null>(null);

    const getTimeLimit = (): number => {
        if (exam.time_mode === 'per_subject' && groupedQuestions) {
            const subject = groupedQuestions[currentSubjectIndex];
            if (!subject) return exam.total_time_minutes * 60;
            return subject.timeLimitMinutes * 60;
        }
        return exam.total_time_minutes * 60;
    };

    const [timeLeft, setTimeLeft] = useState(() => getTimeLimit());

    useEffect(() => {
        setTimeLeft(getTimeLimit());
    }, [currentSubjectIndex, exam.time_mode, exam.total_time_minutes]);

    useEffect(() => {
        if (timeLeft <= 0) {
            handleSubmit();
            return;
        }
        const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    const handleSelect = (questionId: string, option: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: option }));
    };

    const handleNext = () => {
        if (isLastQuestion()) return;

        if (groupedQuestions) {
            const currentData = groupedQuestions[currentSubjectIndex];
            if (currentQuestionIndex < currentData.questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
            } else if (currentSubjectIndex < groupedQuestions.length - 1) {
                setCurrentSubjectIndex(prev => prev + 1);
                setCurrentQuestionIndex(0);
            }
        } else {
            if (currentQuestionIndex < shuffledQuestions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
            }
        }
    };

    const handlePrevious = () => {
        if (groupedQuestions) {
            if (currentQuestionIndex > 0) {
                setCurrentQuestionIndex(prev => prev - 1);
            } else if (currentSubjectIndex > 0) {
                setCurrentSubjectIndex(prev => prev - 1);
                setCurrentQuestionIndex(groupedQuestions[currentSubjectIndex - 1].questions.length - 1);
            }
        } else {
            if (currentQuestionIndex > 0) {
                setCurrentQuestionIndex(prev => prev - 1);
            }
        }
    };

    const handleSubmit = async () => {
        if (submitting || submittedResult) return;
        setSubmitting(true);

        const subjectScores: Array<{
            subject_id: string;
            subject_title: string;
            score: number;
            total: number;
            order_index: number;
        }> = [];

        let totalScore = 0;
        let totalQuestions = 0;

        for (const subject of sortedSubjects) {
            let score = 0;
            for (const q of subject.questions) {
                totalQuestions++;
                if (answers[q.id] === q.correct_option) {
                    score++;
                    totalScore++;
                }
            }
            subjectScores.push({
                subject_id: subject.id,
                subject_title: subject.title,
                score,
                total: subject.questions.length,
                order_index: subject.order_index
            });
        }

        const { data: { user } } = await supabase.auth.getUser();

        const resultPayload = {
            total_score: totalScore,
            total_questions: totalQuestions,
            subject_scores: subjectScores
        };

        if (user) {
            const { data: insertedResult } = await supabase
                .from('exam_results')
                .insert([{
                    user_id: user.id,
                    exam_id: exam.id,
                    subject_id: resultSubjectId,
                    ...resultPayload
                }])
                .select('id, total_score, total_questions, subject_scores, created_at')
                .single();

            if (insertedResult) {
                setSubmittedResult(insertedResult as ClientExamResult);
                setSubmitting(false);
                return;
            }
        }

        setSubmittedResult({
            id: `local-${exam.id}`,
            created_at: new Date().toISOString(),
            ...resultPayload
        });
        setSubmitting(false);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const getCurrentQuestion = (): ExamQuestion | null => {
        if (groupedQuestions) {
            if (currentSubjectIndex < 0 || currentSubjectIndex >= groupedQuestions.length) return null;
            const subjectData = groupedQuestions[currentSubjectIndex];
            if (!subjectData) return null;
            if (currentQuestionIndex < 0 || currentQuestionIndex >= subjectData.questions.length) return null;
            return subjectData.questions[currentQuestionIndex] || null;
        }
        if (currentQuestionIndex < 0 || currentQuestionIndex >= shuffledQuestions.length) return null;
        return shuffledQuestions[currentQuestionIndex] || null;
    };

    const currentQuestion = getCurrentQuestion();

    const getTotalQuestions = (): number => groupedQuestions
        ? sortedSubjects.reduce((sum, s) => sum + s.questions.length, 0)
        : shuffledQuestions.length;

    const getCurrentOverallIndex = (): number => {
        if (groupedQuestions) {
            let idx = 0;
            for (let i = 0; i < currentSubjectIndex; i++) {
                idx += groupedQuestions[i].questions.length;
            }
            return idx + currentQuestionIndex;
        }
        return currentQuestionIndex;
    };

    const isLastQuestion = (): boolean => {
        if (groupedQuestions) {
            return currentSubjectIndex === groupedQuestions.length - 1 &&
                currentQuestionIndex === groupedQuestions[currentSubjectIndex].questions.length - 1;
        }
        return currentQuestionIndex === shuffledQuestions.length - 1;
    };

    const currentSubjectTitle = groupedQuestions ? groupedQuestions[currentSubjectIndex]?.subjectTitle : null;
    const currentSubjectQuestionCount = groupedQuestions ? groupedQuestions[currentSubjectIndex]?.questions.length || 0 : 0;

    if (submittedResult) {
        return <ExamResults result={submittedResult} exam={{ id: exam.id, title: exam.title }} />;
    }

    if (!currentQuestion) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
                <div className="glass-card p-12 rounded-2xl border border-destructive/20 max-w-md">
                    <h2 className="text-2xl font-bold mb-2">No Questions Available</h2>
                    <p className="text-muted-foreground mb-6">
                        This exam doesn&apos;t have any questions yet. Please contact your administrator.
                    </p>
                </div>
            </div>
        );
    }

return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
        <div className="flex items-center justify-between sticky top-4 z-10 glass-card p-4 rounded-xl border-blue-500/30">
                <div>
                    <h2 className="text-xl font-bold">{exam.title}</h2>
                    {groupedQuestions ? (
                        <p className="text-sm text-muted-foreground">
                            {currentSubjectTitle} - Question {currentQuestionIndex + 1} of {currentSubjectQuestionCount}
                        </p>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Question {currentQuestionIndex + 1} of {shuffledQuestions.length}
                        </p>
                    )}
                </div>
                <div className={`text-2xl font-mono p-3 rounded-lg border flex items-center gap-2 ${
                    timeLeft < 60
                        ? 'bg-destructive/20 text-destructive border-destructive/30 animate-pulse'
                        : 'bg-black/50 text-white border-white/10'
                }`}>
                    <Clock size={20} />
                    {formatTime(timeLeft)}
                </div>
            </div>

            {groupedQuestions && (
                <div className="flex items-center gap-2 flex-wrap">
                    {groupedQuestions.map((subject, idx) => (
                        <button
                            key={subject.subjectId}
                            onClick={() => {
                                setCurrentSubjectIndex(idx);
                                setCurrentQuestionIndex(0);
                            }}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                                idx === currentSubjectIndex
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                            }`}
                        >
                            {subject.subjectTitle}
                        </button>
                    ))}
                </div>
            )}

            <div className="glass p-6 rounded-xl border-l-4 border-l-blue-500">
                <h3 className="text-lg font-medium mb-4 pr-8">
                    <span className="text-blue-400 mr-2">{getCurrentOverallIndex() + 1}.</span>
                    {currentQuestion.question_text}
                </h3>

                <div className="space-y-2">
                    {['A', 'B', 'C', 'D'].map(opt => {
                        const optText = getOptionText(currentQuestion, opt);
                        const isSelected = answers[currentQuestion.id] === opt;

                        return (
                            <button
                                key={opt}
                                onClick={() => handleSelect(currentQuestion.id, opt)}
                                className={`w-full text-left p-4 rounded-lg border transition-all ${
                                    isSelected
                                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                        : 'bg-black/40 border-white/5 hover:bg-white/5 hover:border-white/20'
                                }`}
                            >
                                <span className={`font-bold mr-3 ${isSelected ? 'text-blue-400' : 'text-muted-foreground'}`}>
                                    {opt}.
                                </span>
                                {optText}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center justify-between pt-6">
                <button
                    onClick={handlePrevious}
                    disabled={getCurrentOverallIndex() === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <ChevronLeft size={18} /> Previous
                </button>

                {isLastQuestion() ? (
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                    >
                        {submitting ? 'Submitting...' : 'Submit Exam'}
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all"
                    >
                        Next <ChevronRight size={18} />
                    </button>
                )}
            </div>

            <div className="flex justify-center gap-1.5 flex-wrap">
                {(groupedQuestions ? shuffledQuestions : shuffledQuestions).map((q, idx) => {
                    const isAnswered = !!answers[q.id];
                    const isCurrent = idx === getCurrentOverallIndex();
                    return (
                        <button
                            key={q.id}
                            onClick={() => {
                                const totalQuestions = getTotalQuestions();
                                if (idx < 0 || idx >= totalQuestions) return;

                                if (groupedQuestions) {
                                    let subjIdx = 0;
                                    let qIdx = idx;
                                    for (let i = 0; i < groupedQuestions.length; i++) {
                                        if (qIdx < groupedQuestions[i].questions.length) {
                                            subjIdx = i;
                                            break;
                                        }
                                        qIdx -= groupedQuestions[i].questions.length;
                                    }
                                    setCurrentSubjectIndex(subjIdx);
                                    setCurrentQuestionIndex(qIdx);
                                } else {
                                    setCurrentQuestionIndex(idx);
                                }
                            }}
                            className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                                isCurrent
                                    ? 'bg-blue-600 text-white'
                                    : isAnswered
                                        ? 'bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-secondary/50 text-muted-foreground'
                            }`}
                        >
                            {idx + 1}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}