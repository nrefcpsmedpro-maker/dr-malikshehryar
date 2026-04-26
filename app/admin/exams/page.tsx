import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { FileQuestion, Trash2, PlusCircle, Clock, Shuffle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default async function AdminExamsPage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

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

    const addExam = async (formData: FormData) => {
        'use server';
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const time_mode = formData.get('time_mode') as string;
        const total_time = parseInt(formData.get('total_time') as string) || 60;
        const question_order = formData.get('question_order') as string;
        const attempt_mode = formData.get('attempt_mode') as string;

        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);
        await supabase.from('mock_exams').insert([{
            title,
            description,
            time_mode,
            total_time_minutes: total_time,
            question_order,
            attempt_mode
        }]);
        revalidatePath('/admin/exams');
    };

    const deleteExam = async (formData: FormData) => {
        'use server';
        const examId = formData.get('examId') as string;
        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);
        await supabase.from('mock_exams').delete().eq('id', examId);
        revalidatePath('/admin/exams');
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Standalone Mock Exams</h1>
                <p className="text-muted-foreground mt-2 max-w-3xl">
                    Create independent exams with multiple subjects. Exams like &quot;NRE 1 Mock Exam&quot; live here, separate from course-based tests.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="p-6 h-fit sticky top-8">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                        <PlusCircle className="text-primary" />
                        Draft New Exam
                    </h3>

                    <form action={addExam} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Exam Title</label>
                            <Input type="text" name="title" required placeholder="e.g. NRE 1 Mock Exam" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Description</label>
                            <textarea
                                name="description"
                                rows={2}
                                className="w-full px-3 py-2 bg-transparent border border-input rounded-md text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder="Comprehensive nursing exam..."
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
                                <Clock size={12} />
                                Time Mode
                            </label>
                            <select
                                name="time_mode"
                                required
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="total">Total Time (one timer for whole exam)</option>
                                <option value="per_subject">Per Subject (timer resets each subject)</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Time (Minutes)</label>
                            <Input type="number" name="total_time" required defaultValue="60" min="1" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
                                <Shuffle size={12} />
                                Question Order
                            </label>
                            <select
                                name="question_order"
                                required
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="mixed">Mixed (all questions shuffled)</option>
                                <option value="by_subject">By Subject (complete one subject at a time)</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Exam Format</label>
                            <select
                                name="attempt_mode"
                                required
                                defaultValue="full_exam"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="full_exam">Full Exam (all subjects together)</option>
                                <option value="subject_wise">Subject-wise Start (student chooses one subject)</option>
                            </select>
                        </div>

                        <Button type="submit" className="w-full mt-4">
                            Create Standalone Exam
                        </Button>
                    </form>
                </Card>

                <div className="lg:col-span-2 space-y-4">
                    {exams?.map((exam: any) => {
                        const totalQuestions = exam.subjects?.reduce((sum: number, s: any) => sum + (s.questions?.[0]?.count || 0), 0) || 0;
                        return (
                            <Card key={exam.id} className="p-5 flex items-start justify-between group">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-widest ${
                                            exam.time_mode === 'total'
                                                ? 'bg-blue-500/10 text-blue-500'
                                                : 'bg-purple-500/10 text-purple-500'
                                        }`}>
                                            {exam.time_mode === 'total' ? 'Total Time' : 'Per Subject'}
                                        </span>
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
                                    <h4 className="font-bold text-lg mt-2 flex items-center gap-2">
                                        <FileQuestion size={18} className="text-muted-foreground" />
                                        {exam.title}
                                    </h4>
                                    {exam.description && (
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{exam.description}</p>
                                    )}
                                    <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                                        <span>{exam.subjects?.length || 0} Subjects</span>
                                        <span>{totalQuestions} Questions</span>
                                        <span>{exam.total_time_minutes} Min</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 ml-4">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/admin/exams/${exam.id}/builder`}>
                                            Open Builder
                                        </Link>
                                    </Button>
                                    <form action={deleteExam}>
                                        <input type="hidden" name="examId" value={exam.id} />
                                        <Button
                                            type="submit"
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        >
                                            <Trash2 size={18} />
                                        </Button>
                                    </form>
                                </div>
                            </Card>
                        );
                    })}

                    {!exams?.length && (
                        <Card className="text-center p-12">
                            <FileQuestion size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
                            <p className="text-muted-foreground">No standalone exams created yet.</p>
                            <p className="text-sm text-muted-foreground mt-1">Create your first exam using the form.</p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}