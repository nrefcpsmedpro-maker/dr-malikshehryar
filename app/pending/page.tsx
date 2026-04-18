import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function PendingApprovalPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
     redirect('/login');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
       <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10" />

       <Card className="max-w-lg w-full p-12 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
             <span className="text-3xl text-primary">⏳</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight mb-3">Pending Approval</h1>
          <p className="text-muted-foreground mb-8 text-lg">
            Your account has been created successfully, but an administrator must approve your access before you can view courses.
          </p>

          <div className="p-4 rounded-lg bg-black/40 border border-white/5 inline-flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
             <span className="text-sm font-medium">Status: Awaiting Administrator Review</span>
          </div>

          {/* Added logout button so they aren't trapped if they want to switch accounts */}
          <form action="/auth/signout" method="post" className="mt-8">
             <Button variant="link" type="submit" className="text-muted-foreground">
                 Sign Out
             </Button>
          </form>
       </Card>
    </div>
  );
}
