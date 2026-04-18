import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import TestEngine from '@/components/TestEngine';

export default async function StudentTestPage({
  params,
}: {
  params: Promise<{ courseId: string; testId: string }>;
}) {
  const { courseId, testId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch test details
  const { data: test, error } = await supabase
    .from('mock_tests')
    .select(`*, questions:mock_questions(*)`)
    .eq('id', testId)
    .single();

  if (error || !test) redirect(`/dashboard/courses/${courseId}`);

  // Did the user already take this test?
  const { data: result } = await supabase
    .from('mock_results')
    .select('*')
    .eq('test_id', testId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (result) {
     const percentage = Math.round((result.score / result.total_questions) * 100);
     const isPassing = percentage >= 60;
     
     return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
           <div className={`glass-card max-w-lg w-full p-12 rounded-2xl text-center border-t-4 ${isPassing ? 'border-t-emerald-500' : 'border-t-destructive'}`}>
              <h2 className="text-2xl font-bold mb-2">Test Completed</h2>
              <p className="text-muted-foreground mb-8">{test.title}</p>
              
              <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center border-4 mb-6 ${isPassing ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-destructive/30 bg-destructive/10'}`}>
                 <div>
                    <span className={`text-4xl font-bold ${isPassing ? 'text-emerald-400' : 'text-destructive'}`}>
                       {percentage}%
                    </span>
                 </div>
              </div>
              
              <div className="flex justify-center gap-6 mb-8 text-sm font-medium">
                 <div className="flex flex-col">
                    <span className="text-muted-foreground uppercase text-xs tracking-wider">Score</span>
                    <span className="text-lg">{result.score} / {result.total_questions}</span>
                 </div>
                 <div className="w-px bg-white/10" />
                 <div className="flex flex-col">
                    <span className="text-muted-foreground uppercase text-xs tracking-wider">Status</span>
                    <span className={`text-lg ${isPassing ? 'text-emerald-400' : 'text-destructive'}`}>{isPassing ? 'PASSED' : 'FAILED'}</span>
                 </div>
              </div>

              <Link href={`/dashboard/courses/${courseId}`} className="inline-block px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors">
                 Back to Course
              </Link>
           </div>
        </div>
     );
  }

  // If not taken, render the Test Engine
  return <TestEngine test={test} courseId={courseId} />;
}
