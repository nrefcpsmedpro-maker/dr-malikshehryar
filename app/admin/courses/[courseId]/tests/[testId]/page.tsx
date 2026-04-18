import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Trash2, PlusCircle } from 'lucide-react';
import { revalidatePath } from 'next/cache';

export default async function AdminTestBuilderPage({
  params,
}: {
  params: Promise<{ courseId: string; testId: string }>;
}) {
  const { courseId, testId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: test, error } = await supabase
    .from('mock_tests')
    .select(`
      *,
      course:courses(title),
      questions:mock_questions(*)
    `)
    .eq('id', testId)
    .single();

  if (error || !test) {
    redirect(`/admin/courses/${courseId}`);
  }

  // --- SERVER ACTIONS ---
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

    await supabase.from('mock_questions').insert([{
        test_id: testId,
        question_text,
        option_a, option_b, option_c, option_d,
        correct_option
    }]);
    revalidatePath(`/admin/courses/${courseId}/tests/${testId}`);
  };

  const removeQuestion = async (formData: FormData) => {
    'use server';
    const questionId = formData.get('questionId') as string;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    await supabase.from('mock_questions').delete().eq('id', questionId);
    revalidatePath(`/admin/courses/${courseId}/tests/${testId}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div>
         <Link href={`/admin/courses/${courseId}`} className="text-purple-500 hover:text-purple-400 text-sm font-medium mb-2 inline-block">
            &larr; Back to {test.course?.title}
         </Link>
         <h1 className="text-3xl font-bold tracking-tight">{test.title} Builder</h1>
         <p className="text-muted-foreground mt-2 max-w-3xl">
           Add multiple-choice questions to this assessment. Total time limit is {test.time_limit_minutes} minutes.
         </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add Question Form */}
          <div className="glass-card p-6 h-fit sticky top-8">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
               <PlusCircle className="text-purple-400" />
               New Question
            </h3>
            
            <form action={addQuestion} className="space-y-4">
               <div className="space-y-1">
                 <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Question Text</label>
                 <textarea name="question_text" required rows={3} className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md focus:ring-2 focus:ring-purple-500 text-sm" placeholder="What is the powerhouse of the cell?" />
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Option A</label>
                    <input type="text" name="option_a" required className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md focus:ring-2 focus:ring-purple-500 text-sm" placeholder="Mitochondria" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Option B</label>
                    <input type="text" name="option_b" required className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md focus:ring-2 focus:ring-purple-500 text-sm" placeholder="Nucleus" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Option C</label>
                    <input type="text" name="option_c" required className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md focus:ring-2 focus:ring-purple-500 text-sm" placeholder="Ribosome" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Option D</label>
                    <input type="text" name="option_d" required className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md focus:ring-2 focus:ring-purple-500 text-sm" placeholder="Golgi Apparatus" />
                  </div>
               </div>

               <div className="space-y-1 pt-4 border-t border-white/10">
                 <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Correct Answer</label>
                 <select name="correct_option" required className="w-full px-3 py-2 bg-black focus:bg-black border border-white/10 rounded-md focus:ring-2 focus:ring-purple-500 text-sm">
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                 </select>
               </div>

               <button type="submit" className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors text-sm mt-4 shadow-lg shadow-purple-900/20">
                 Save Question
               </button>
            </form>
          </div>

          {/* List of Questions */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg mb-2">Current Questions ({test.questions?.length || 0})</h3>
            
            {test.questions?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((q: any, i: number) => (
               <div key={q.id} className="glass p-5 rounded-lg border-l-4 border-l-purple-500 relative group">
                  <form action={removeQuestion} className="absolute right-4 top-4">
                     <input type="hidden" name="questionId" value={q.id} />
                     <button type="submit" className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-2">
                        <Trash2 size={16} />
                     </button>
                  </form>
                  
                  <h4 className="font-bold mb-3 pr-8"><span className="text-purple-400 mr-2">Q{i + 1}.</span> {q.question_text}</h4>
                  
                  <div className="grid grid-cols-1 gap-2 text-sm">
                     <div className={`p-2 rounded-md ${q.correct_option === 'A' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-black/40 text-muted-foreground'}`}>
                        <span className="font-bold mr-2">A.</span> {q.option_a}
                     </div>
                     <div className={`p-2 rounded-md ${q.correct_option === 'B' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-black/40 text-muted-foreground'}`}>
                        <span className="font-bold mr-2">B.</span> {q.option_b}
                     </div>
                     <div className={`p-2 rounded-md ${q.correct_option === 'C' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-black/40 text-muted-foreground'}`}>
                        <span className="font-bold mr-2">C.</span> {q.option_c}
                     </div>
                     <div className={`p-2 rounded-md ${q.correct_option === 'D' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-black/40 text-muted-foreground'}`}>
                        <span className="font-bold mr-2">D.</span> {q.option_d}
                     </div>
                  </div>
               </div>
            ))}
            
            {test.questions?.length === 0 && (
               <div className="text-center p-12 glass-card rounded-xl">
                  <p className="text-muted-foreground">No questions added yet.</p>
               </div>
            )}
          </div>
      </div>
    </div>
  );
}
