import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { ArrowLeft, PlusCircle, Trash2, HelpCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default async function SubjectBuilderPage({
    params,
}: {
    params: Promise<{ examId: string; subjectId: string }>;
}) {
    const { examId, subjectId } = await params;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: subject, error } = await supabase
        .from('exam_subjects')
        .select(`
            *,
            exam:mock_exams(title),
            questions:exam_questions(*)
        `)
        .eq('id', subjectId)
        .single();

    if (error || !subject) {
        redirect(`/admin/exams/${examId}/builder`);
    }

    const sortedQuestions = [...(subject.questions || [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const addQuestion = async (formData: FormData) => {
        'use server';
        const question_text = formData.get('question_text') as string;
        const option_a = formData.get('option_a') as string;
        const option_b = formData.get('option_b') as string;
        const option_c = formData.get('option_c') as string;
        const option_d = formData.get('option_d') as string;
        const correct_option = formData.get('correct_option') as string;

        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);
        await supabase.from('exam_questions').insert([{
            subject_id: subjectId,
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_option
        }]);
        revalidatePath(`/admin/exams/${examId}/subjects/${subjectId}`);
    };

    const deleteQuestion = async (formData: FormData) => {
        'use server';
        const questionId = formData.get('questionId') as string;
        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);
        await supabase.from('exam_questions').delete().eq('id', questionId);
        revalidatePath(`/admin/exams/${examId}/subjects/${subjectId}`);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <div>
                <Link
                    href={`/admin/exams/${examId}/builder`}
                    className="text-purple-500 hover:text-purple-400 text-sm font-medium mb-2 inline-flex items-center gap-1"
                >
                    <ArrowLeft size={16} /> Back to {subject.exam?.title} Builder
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">{subject.title}</h1>
                <p className="text-muted-foreground mt-2">
                    Add and manage questions for this subject.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-6 h-fit sticky top-8">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                        <PlusCircle className="text-purple-400" />
                        New Question
                    </h3>

                    <form action={addQuestion} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                Question Text
                            </label>
                            <textarea
                                name="question_text"
                                required
                                rows={3}
                                className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md focus:ring-2 focus:ring-purple-500 text-sm"
                                placeholder="What is the function of...?"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Option A</label>
                                <input
                                    type="text"
                                    name="option_a"
                                    required
                                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md focus:ring-2 focus:ring-purple-500 text-sm"
                                    placeholder="First option"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Option B</label>
                                <input
                                    type="text"
                                    name="option_b"
                                    required
                                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md focus:ring-2 focus:ring-purple-500 text-sm"
                                    placeholder="Second option"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Option C</label>
                                <input
                                    type="text"
                                    name="option_c"
                                    required
                                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md focus:ring-2 focus:ring-purple-500 text-sm"
                                    placeholder="Third option"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Option D</label>
                                <input
                                    type="text"
                                    name="option_d"
                                    required
                                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md focus:ring-2 focus:ring-purple-500 text-sm"
                                    placeholder="Fourth option"
                                />
                            </div>
                        </div>

                        <div className="space-y-1 pt-4 border-t border-white/10">
                            <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                Correct Answer
                            </label>
                            <select
                                name="correct_option"
                                required
                                className="w-full px-3 py-2 bg-black focus:bg-black border border-white/10 rounded-md focus:ring-2 focus:ring-purple-500 text-sm"
                            >
                                <option value="A">Option A</option>
                                <option value="B">Option B</option>
                                <option value="C">Option C</option>
                                <option value="D">Option D</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors text-sm mt-4 shadow-lg shadow-purple-900/20"
                        >
                            Save Question
                        </button>
                    </form>
                </Card>

                <div className="space-y-4">
                    <h3 className="font-bold text-lg mb-2">
                        Questions ({sortedQuestions.length})
                    </h3>

                    {sortedQuestions.length === 0 && (
                        <Card className="p-12 text-center">
                            <HelpCircle size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
                            <p className="text-muted-foreground">No questions added yet.</p>
                            <p className="text-sm text-muted-foreground mt-1">Add your first question using the form.</p>
                        </Card>
                    )}

                    {sortedQuestions.map((q: any, i: number) => (
                        <div
                            key={q.id}
                            className="glass p-5 rounded-lg border-l-4 border-l-purple-500 relative group"
                        >
                            <form action={deleteQuestion} className="absolute right-4 top-4">
                                <input type="hidden" name="questionId" value={q.id} />
                                <button
                                    type="submit"
                                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-2"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </form>

                            <h4 className="font-bold mb-3 pr-8">
                                <span className="text-purple-400 mr-2">Q{i + 1}.</span>
                                {q.question_text}
                            </h4>

                            <div className="grid grid-cols-1 gap-2 text-sm">
                                {['A', 'B', 'C', 'D'].map(opt => {
                                    const isCorrect = q.correct_option === opt;
                                    return (
                                        <div
                                            key={opt}
                                            className={`p-2 rounded-md ${
                                                isCorrect
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                    : 'bg-black/40 text-muted-foreground'
                                            }`}
                                        >
                                            <span className="font-bold mr-2">{opt}.</span>
                                            {q[`option_${opt.toLowerCase()}`]}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}