'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function TestEngine({ 
  test, 
  courseId 
}: { 
  test: any, 
  courseId: string 
}) {
  const router = useRouter();
  const supabase = createClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(test.time_limit_minutes * 60);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleSelect = (questionId: string, option: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    let score = 0;

    test.questions.forEach((q: any) => {
      if (answers[q.id] === q.correct_option) {
        score++;
      }
    });

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase.from('mock_results').insert([{
        user_id: user.id,
        test_id: test.id,
        score,
        total_questions: test.questions.length
      }]);
    }

    router.refresh(); // Refreshing server component should now pick up the result and show score
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex items-center justify-between sticky top-4 z-10 glass-card p-4 rounded-xl border-blue-500/30">
         <div>
            <h2 className="text-xl font-bold">{test.title}</h2>
            <p className="text-sm text-muted-foreground">{test.questions.length} Questions</p>
         </div>
         <div className={`text-2xl font-mono p-3 rounded-lg border ${timeLeft < 60 ? 'bg-destructive/20 text-destructive border-destructive/30 animate-pulse' : 'bg-black/50 text-white border-white/10'}`}>
            {formatTime(timeLeft)}
         </div>
      </div>

      <div className="space-y-6">
         {test.questions.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((q: any, i: number) => (
            <div key={q.id} className="glass p-6 rounded-xl border-l-4 border-l-blue-500">
               <h3 className="text-lg font-medium mb-4 pr-8"><span className="text-blue-400 mr-2">{i + 1}.</span> {q.question_text}</h3>
               
               <div className="space-y-2">
                  {['A', 'B', 'C', 'D'].map(opt => {
                     const optText = q[`option_${opt.toLowerCase()}`];
                     const isSelected = answers[q.id] === opt;
                     
                     return (
                        <button 
                           key={opt}
                           onClick={() => handleSelect(q.id, opt)}
                           className={`w-full text-left p-4 rounded-lg border transition-all ${isSelected ? 'bg-blue-600/20 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-black/40 border-white/5 hover:bg-white/5 hover:border-white/20'}`}
                        >
                           <span className={`font-bold mr-3 ${isSelected ? 'text-blue-400' : 'text-muted-foreground'}`}>{opt}.</span>
                           {optText}
                        </button>
                     );
                  })}
               </div>
            </div>
         ))}
      </div>

      <div className="flex justify-end pt-6">
         <button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
         >
            {submitting ? 'Submitting...' : 'Submit Answers & Finish'}
         </button>
      </div>
    </div>
  );
}
