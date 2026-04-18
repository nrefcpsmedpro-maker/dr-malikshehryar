import { createClient } from '@/utils/supabase/server';
import Navbar from '@/components/Navbar';
import { redirect } from 'next/navigation';

import { cookies } from 'next/headers';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // We don't strictly reject admins here; they might want to view the student perspective.
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar role="student" />
      <main className="flex-1 pt-24 px-6 pb-12 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
