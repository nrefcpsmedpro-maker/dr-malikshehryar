import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ExamEngine from '@/components/ExamEngine';
import ExamResults from '@/components/ExamResults';
import { Card } from '@/components/ui/card';
import { BookOpen, Clock, FileQuestion } from 'lucide-react';

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
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: exam, error } = await supabase
        .from('mock_exams')
        .select(`
            *,
            subjects:exam_subjects(
                id,
                title,
                order_index,
                time_limit_minutes,
                questions:exam_questions(
                    id,
                    question_text,
                    option_a,
                    option_b,
                    option_c,
                    option_d,
                    correct_option,
                    created_at
                )
            )
        `)
        .eq('id', examId)
        .single();

    if (error || !exam) redirect('/dashboard/exams');

    const sortedSubjects = [...(exam.subjects || [])].sort((a: any, b: any) => a.order_index - b.order_index);
    const subjectsWithQuestions = sortedSubjects.filter((subject: any) => (subject.questions?.length || 0) > 0);
    const isFullExamAttempt = !subjectId || subjectId === 'full';
    const selectedSubject = subjectId
        ? sortedSubjects.find((subject: any) => subject.id === subjectId) || null
        : null;

    if (exam.attempt_mode === 'subject_wise' && !isFullExamAttempt && !selectedSubject) {
        redirect(`/dashboard/exams/${exam.id}`);
    }

    if (exam.attempt_mode === 'subject_wise' && !subjectId) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{exam.title}</h1>
                    <p className="text-muted-foreground mt-2">
                        Choose a subject to start a focused exam attempt.
                    </p>
                </div>

                {subjectsWithQuestions.length === 0 ? (
                    <Card className="p-12 text-center">
                        <FileQuestion size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
                        <p className="text-muted-foreground">No subjects with questions are available yet.</p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {subjectsWithQuestions.map((subject: any) => (
                            <Card key={subject.id} className="p-6 border-l-4 border-l-indigo-500">
                                <h3 className="font-bold text-xl mb-2">{subject.title}</h3>
                                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-5">
                                    <span className="flex items-center gap-1">
                                        <BookOpen size={14} />
                                        Subject
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <FileQuestion size={14} />
                                        {subject.questions.length} Questions
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock size={14} />
                                        {subject.time_limit_minutes || exam.total_time_minutes} Min
                                    </span>
                                </div>
                                <Link
                                    href={`/dashboard/exams/${exam.id}?subjectId=${subject.id}`}
                                    className="block w-full text-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors"
                                >
                                    Start {subject.title}
                                </Link>
                            </Card>
                        ))}
                    </div>
                )}

                <div className="pt-2">
                    <Link
                        href={`/dashboard/exams/${exam.id}?subjectId=full`}
                        className="inline-flex items-center justify-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors"
                    >
                        Start Full Exam Instead
                    </Link>
                </div>
            </div>
        );
    }

    const scopedExam = exam.attempt_mode === 'subject_wise' && selectedSubject && !isFullExamAttempt
        ? {
            ...exam,
            subjects: [selectedSubject]
        }
        : exam;

    const resultQuery = supabase
        .from('exam_results')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', user.id);

    if (exam.attempt_mode === 'subject_wise' && selectedSubject && !isFullExamAttempt) {
        resultQuery.eq('subject_id', selectedSubject.id);
    } else {
        resultQuery.is('subject_id', null);
    }

    const { data: result } = await resultQuery
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (result) {
        return (
            <ExamResults
                result={result}
                exam={{
                    id: exam.id,
                    title: selectedSubject && !isFullExamAttempt ? `${exam.title} - ${selectedSubject.title}` : exam.title
                }}
            />
        );
    }

    return (
        <ExamEngine
            exam={scopedExam}
            resultSubjectId={exam.attempt_mode === 'subject_wise' && selectedSubject && !isFullExamAttempt ? selectedSubject.id : null}
        />
    );
}