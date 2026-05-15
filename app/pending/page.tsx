import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Clock3, GraduationCap, LogOut, ShieldCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default async function PendingApprovalPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary/40 px-5 py-10">
      <Card className="w-full max-w-2xl rounded-lg p-8 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Clock3 size={32} />
        </div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Account review</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Pending administrator approval</h1>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-muted-foreground">
          Your MedPro LMS account has been created. An administrator needs to approve access
          before courses, lessons, exams, and certificates become available.
        </p>

        <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
          <div className="rounded-lg border bg-background p-4">
            <ShieldCheck className="text-emerald-600 dark:text-emerald-300" size={20} />
            <p className="mt-3 text-sm font-semibold">Access is protected</p>
            <p className="mt-1 text-sm text-muted-foreground">Only approved students can open academy content.</p>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <GraduationCap className="text-primary" size={20} />
            <p className="mt-3 text-sm font-semibold">Courses stay ready</p>
            <p className="mt-1 text-sm text-muted-foreground">Once approved, your dashboard will open automatically.</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild variant="secondary">
            <Link href="/">Back to academy</Link>
          </Button>
          <form action="/auth/signout" method="post">
            <Button variant="ghost" type="submit" className="text-muted-foreground hover:text-destructive">
              <LogOut size={17} className="mr-2" />
              Sign out
            </Button>
          </form>
        </div>
      </Card>
    </main>
  );
}
