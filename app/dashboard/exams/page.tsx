import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FileQuestion, Clock, BookOpen, Award } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default async function StudentExamsPage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: exams } = await supabase
        .from('mock_exams')
        .select(`
            *,
            subjects:exam_subjects(
                id,
                title,
                order_index,
                questions:exam_questions(count)
            )
        `)
        .order('created_at', { ascending: false });

    const { data: results } = await supabase
        .from('exam_results')
        .select('exam_id, total_score, total_questions')
        .is('subject_id', null)
        .eq('user_id', user.id);

    const examResultsMap: Record<string, { score: number; total: number }> = {};
    results?.forEach(r => {
        examResultsMap[r.exam_id] = { score: r.total_score, total: r.total_questions };
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Mock Exams</h1>
                <p className="text-muted-foreground mt-2">
                    Practice with comprehensive standalone exams. Each exam covers multiple subjects.
                </p>
            </div>

            {!exams?.length && (
                <Card className="p-12 text-center">
                    <FileQuestion size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
                    <p className="text-muted-foreground">No exams available yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">Check back later for new exams.</p>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {exams?.map((exam: any) => {
                    const totalQuestions = exam.subjects?.reduce(
                        (sum: number, s: any) => sum + (s.questions?.[0]?.count || 0), 0
                    ) || 0;
                    const userResult = examResultsMap[exam.id];
                    const percentage = userResult
                        ? Math.round((userResult.score / userResult.total) * 100)
                        : null;

                    return (
                        <Card key={exam.id} className="p-6 flex flex-col border-l-4 border-l-purple-500">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Award className="text-purple-500" size={20} />
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-widest ${
                                        exam.question_order === 'mixed'
                                            ? 'bg-amber-500/10 text-amber-500'
                                            : 'bg-emerald-500/10 text-emerald-500'
                                    }`}>
                                        {exam.question_order === 'mixed' ? 'Mixed' : 'By Subject'}
                                    </span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-widest ${
                                        exam.attempt_mode === 'subject_wise'
                                            ? 'bg-indigo-500/10 text-indigo-500'
                                            : 'bg-cyan-500/10 text-cyan-500'
                                    }`}>
                                        {exam.attempt_mode === 'subject_wise' ? 'Subject-wise' : 'Full Exam'}
                                    </span>
                                </div>
                                {exam.time_mode === 'per_subject' && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock size={12} />
                                        Per Subject
                                    </span>
                                )}
                            </div>

                            <h3 className="font-bold text-xl mb-2">{exam.title}</h3>
                            {exam.description && (
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{exam.description}</p>
                            )}

                            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-4">
                                <span className="flex items-center gap-1">
                                    <BookOpen size={14} />
                                    {exam.subjects?.length || 0} Subjects
                                </span>
                                <span className="flex items-center gap-1">
                                    <FileQuestion size={14} />
                                    {totalQuestions} Questions
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock size={14} />
                                    {exam.total_time_minutes} Min
                                </span>
                            </div>

                            <div className="mt-auto">
                                {userResult ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs text-muted-foreground">Your Score</span>
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                        percentage && percentage >= 60
                                                            ? 'bg-emerald-500/10 text-emerald-500'
                                                            : 'bg-destructive/10 text-destructive'
                                                    }`}>
                                                        {percentage && percentage >= 60 ? 'PASSED' : 'FAILED'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-bold">{userResult.score}/{userResult.total}</span>
                                                    <span className="text-sm text-muted-foreground">({percentage}%)</span>
                                                </div>
                                            </div>
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                                                percentage && percentage >= 60
                                                    ? 'border-emerald-500/30 bg-emerald-500/10'
                                                    : 'border-destructive/30 bg-destructive/10'
                                            }`}>
                                                <span className={`text-sm font-bold ${
                                                    percentage && percentage >= 60
                                                        ? 'text-emerald-400'
                                                        : 'text-destructive'
                                                }`}>
                                                    {percentage}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Link
                                                href={`/dashboard/exams/${exam.id}`}
                                                className="flex-1 text-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors text-sm"
                                            >
                                                Retake Exam
                                            </Link>
                                            <Link
                                                href={`/dashboard/exams/${exam.id}/result`}
                                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-md font-medium transition-colors text-sm"
                                            >
                                                View Details
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <Link
                                        href={`/dashboard/exams/${exam.id}`}
                                        className="block w-full text-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors"
                                    >
                                        Begin Exam
                                    </Link>
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}