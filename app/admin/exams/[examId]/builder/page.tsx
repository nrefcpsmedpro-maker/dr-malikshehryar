import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { ArrowLeft, PlusCircle, Trash2, BookOpen, Clock, Edit2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default async function ExamBuilderPage({
    params,
}: {
    params: Promise<{ examId: string }>;
}) {
    const { examId } = await params;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

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

    if (error || !exam) {
        redirect('/admin/exams');
    }

    const sortedSubjects = [...(exam.subjects || [])].sort((a, b) => a.order_index - b.order_index);

    const addSubject = async (formData: FormData) => {
        'use server';
        const title = formData.get('title') as string;
        const time_limit = formData.get('time_limit') ? parseInt(formData.get('time_limit') as string) : null;

        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);

        const maxOrder = exam.subjects?.length ? Math.max(...exam.subjects.map((s: any) => s.order_index)) : -1;

        await supabase.from('exam_subjects').insert([{
            exam_id: examId,
            title,
            order_index: maxOrder + 1,
            time_limit_minutes: time_limit
        }]);
        revalidatePath(`/admin/exams/${examId}/builder`);
    };

    const deleteSubject = async (formData: FormData) => {
        'use server';
        const subjectId = formData.get('subjectId') as string;
        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);
        await supabase.from('exam_subjects').delete().eq('id', subjectId);
        revalidatePath(`/admin/exams/${examId}/builder`);
    };

    const updateExamSettings = async (formData: FormData) => {
        'use server';
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const time_mode = formData.get('time_mode') as string;
        const total_time = parseInt(formData.get('total_time') as string) || 60;
        const question_order = formData.get('question_order') as string;
        const attempt_mode = formData.get('attempt_mode') as string;

        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);
        await supabase.from('mock_exams').update({
            title,
            description,
            time_mode,
            total_time_minutes: total_time,
            question_order,
            attempt_mode
        }).eq('id', examId);
revalidatePath(`/admin/exams/${examId}/builder`);
};

return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
            <div>
                <Link href="/admin/exams" className="text-primary hover:text-primary/80 text-sm font-medium mb-2 inline-flex items-center gap-1">
                    <ArrowLeft size={16} /> Back to Exams
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">{exam.title} Builder</h1>
                <p className="text-muted-foreground mt-2">
                    Manage subjects and questions for this standalone exam.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="space-y-6">
                    <Card className="p-6">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Edit2 size={18} className="text-muted-foreground" />
                            Exam Settings
                        </h3>
                        <form action={updateExamSettings} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Title</label>
                                <Input type="text" name="title" required defaultValue={exam.title} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Description</label>
                                <textarea
                                    name="description"
                                    rows={2}
                                    defaultValue={exam.description || ''}
                                    className="w-full px-3 py-2 bg-transparent border border-input rounded-md text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
                                    <Clock size={12} /> Time Mode
                                </label>
                                <select name="time_mode" required defaultValue={exam.time_mode} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                    <option value="total">Total Time (one timer)</option>
                                    <option value="per_subject">Per Subject (timer resets)</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Time (Min)</label>
                                <Input type="number" name="total_time" required defaultValue={exam.total_time_minutes} min="1" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
                                    Order
                                </label>
                                <select name="question_order" required defaultValue={exam.question_order} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                    <option value="mixed">Mixed (shuffled)</option>
                                    <option value="by_subject">By Subject (grouped)</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Exam Format</label>
                                <select name="attempt_mode" required defaultValue={exam.attempt_mode || 'full_exam'} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                    <option value="full_exam">Full Exam (all subjects together)</option>
                                    <option value="subject_wise">Subject-wise Start (student chooses one subject)</option>
                                </select>
                            </div>
                            <Button type="submit" variant="secondary" className="w-full">Save Settings</Button>
                        </form>
                    </Card>

                    <Card className="p-6 border-purple-500/20 bg-purple-500/5">
                        <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                            <PlusCircle size={16} className="text-purple-400" />
                            Add Subject
                        </h3>
                        <form action={addSubject} className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Subject Title</label>
                                <Input type="text" name="title" required placeholder="e.g. Anatomy" className="h-9 text-sm" />
                            </div>
                            {exam.time_mode === 'per_subject' && (
                                <div className="space-y-1">
                                    <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Time Limit (Min)</label>
                                    <Input type="number" name="time_limit" placeholder="Optional" min="1" className="h-9 text-sm" />
                                </div>
                            )}
                            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">Add Subject</Button>
                        </form>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <h3 className="font-bold text-lg">Subjects ({sortedSubjects.length})</h3>

                    {sortedSubjects.length === 0 && (
                        <Card className="p-12 text-center">
                            <BookOpen size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
                            <p className="text-muted-foreground">No subjects added yet.</p>
                            <p className="text-sm text-muted-foreground mt-1">Add a subject to get started.</p>
                        </Card>
                    )}

                    {sortedSubjects.map((subject: any, index: number) => (
                        <Card key={subject.id} className="p-6 border-l-4 border-l-purple-500">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded">
                                            Subject {index + 1}
                                        </span>
                                        {exam.time_mode === 'per_subject' && subject.time_limit_minutes && (
                                            <span className="text-xs text-muted-foreground">
                                                {subject.time_limit_minutes} min
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="font-bold text-lg mt-1">{subject.title}</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {subject.questions?.length || 0} questions
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/admin/exams/${examId}/subjects/${subject.id}`}>
                                            Manage Questions
                                        </Link>
                                    </Button>
                                    <form action={deleteSubject}>
                                        <input type="hidden" name="subjectId" value={subject.id} />
                                        <Button type="submit" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                                            <Trash2 size={16} />
                                        </Button>
                                    </form>
                                </div>
                            </div>

                            {subject.questions && subject.questions.length > 0 && (
                                <div className="space-y-2 mt-4 pt-4 border-t border-border">
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-3">
                                        Questions Preview
                                    </p>
                                    {subject.questions.slice(0, 3).map((q: any, qIndex: number) => (
                                        <div key={q.id} className="p-3 bg-secondary/30 rounded-md text-sm flex items-start gap-2">
                                            <span className="text-purple-400 font-bold shrink-0">{qIndex + 1}.</span>
                                            <span className="flex-1 line-clamp-1">{q.question_text}</span>
                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                                q.correct_option === 'A' ? 'bg-emerald-500/20 text-emerald-400' :
                                                q.correct_option === 'B' ? 'bg-blue-500/20 text-blue-400' :
                                                q.correct_option === 'C' ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-rose-500/20 text-rose-400'
                                            }`}>
                                                {q.correct_option}
                                            </span>
                                        </div>
                                    ))}
                                    {subject.questions.length > 3 && (
                                        <p className="text-xs text-muted-foreground text-center pt-2">
                                            +{subject.questions.length - 3} more questions
                                        </p>
                                    )}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}