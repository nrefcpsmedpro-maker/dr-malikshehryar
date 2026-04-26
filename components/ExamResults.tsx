'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { RotateCcw, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface SubjectScore {
    subject_id: string;
    subject_title: string;
    score: number;
    total: number;
    order_index: number;
}

interface ExamResultData {
    id: string;
    total_score: number;
    total_questions: number;
    subject_scores: SubjectScore[];
    created_at: string;
}

interface ExamInfo {
    id: string;
    title: string;
}

interface ExamResultsProps {
    result: ExamResultData;
    exam: ExamInfo;
}

export default function ExamResults({ result, exam }: ExamResultsProps) {
    const router = useRouter();
    const supabase = createClient();
    const [showSubjects, setShowSubjects] = useState(false);
    const [retaking, setRetaking] = useState(false);

    const percentage = Math.round((result.total_score / result.total_questions) * 100);
    const isPassing = percentage >= 60;

    const handleRetake = async () => {
        setRetaking(true);
        await supabase.from('exam_results').delete().eq('id', result.id);
        router.refresh();
    };

    const sortedSubjectScores = [...(result.subject_scores || [])].sort(
        (a, b) => a.order_index - b.order_index
    );

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
            <div className={`glass-card max-w-2xl w-full p-10 rounded-2xl text-center border-t-4 ${
                isPassing ? 'border-t-emerald-500' : 'border-t-destructive'
            }`}>
                <div className="flex items-center justify-center gap-3 mb-2">
                    {isPassing ? (
                        <CheckCircle className="text-emerald-500" size={28} />
                    ) : (
                        <XCircle className="text-destructive" size={28} />
                    )}
                    <h2 className="text-2xl font-bold">{isPassing ? 'Exam Passed!' : 'Exam Failed'}</h2>
                </div>
                <p className="text-muted-foreground mb-8">{exam.title}</p>

                <div className={`w-36 h-36 mx-auto rounded-full flex items-center justify-center border-4 mb-6 ${
                    isPassing ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-destructive/30 bg-destructive/10'
                }`}>
                    <div>
                        <span className={`text-5xl font-bold ${isPassing ? 'text-emerald-400' : 'text-destructive'}`}>
                            {percentage}%
                        </span>
                    </div>
                </div>

                <div className="flex justify-center gap-8 mb-8 text-sm font-medium">
                    <div className="flex flex-col">
                        <span className="text-muted-foreground uppercase text-xs tracking-wider">Score</span>
                        <span className="text-lg">{result.total_score} / {result.total_questions}</span>
                    </div>
                    <div className="w-px bg-white/10" />
                    <div className="flex flex-col">
                        <span className="text-muted-foreground uppercase text-xs tracking-wider">Status</span>
                        <span className={`text-lg ${isPassing ? 'text-emerald-400' : 'text-destructive'}`}>
                            {isPassing ? 'PASSED' : 'FAILED'}
                        </span>
                    </div>
                    <div className="w-px bg-white/10" />
                    <div className="flex flex-col">
                        <span className="text-muted-foreground uppercase text-xs tracking-wider">Questions</span>
                        <span className="text-lg">{result.total_questions}</span>
                    </div>
                </div>

                <div className="border-t border-border pt-6 mb-6">
                    <button
                        onClick={() => setShowSubjects(!showSubjects)}
                        className="flex items-center justify-center gap-2 w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        View Per-Subject Breakdown
                        {showSubjects ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showSubjects && (
                        <div className="mt-4 space-y-3 text-left">
                            {sortedSubjectScores.map((subject) => {
                                const subjectPercent = Math.round((subject.score / subject.total) * 100);
                                const subjectPassing = subjectPercent >= 60;
                                return (
                                    <div
                                        key={subject.subject_id}
                                        className="p-4 rounded-lg bg-secondary/30 border border-border"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                {subjectPassing ? (
                                                    <CheckCircle size={14} className="text-emerald-500" />
                                                ) : (
                                                    <XCircle size={14} className="text-destructive" />
                                                )}
                                                <span className="font-medium">{subject.subject_title}</span>
                                            </div>
                                            <span className={`text-sm font-bold ${
                                                subjectPassing ? 'text-emerald-400' : 'text-destructive'
                                            }`}>
                                                {subject.score}/{subject.total} ({subjectPercent}%)
                                            </span>
                                        </div>
                                        <div className="w-full bg-black/40 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all ${
                                                    subjectPassing ? 'bg-emerald-500' : 'bg-destructive'
                                                }`}
                                                style={{ width: `${subjectPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                        href="/dashboard/exams"
                        className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors"
                    >
                        Back to Exams
                    </Link>
                    <button
                        onClick={handleRetake}
                        disabled={retaking}
                        className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        <RotateCcw size={16} />
                        {retaking ? 'Resetting...' : 'Retake Exam'}
                    </button>
                </div>
            </div>
        </div>
    );
}