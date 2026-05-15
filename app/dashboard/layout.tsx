import { createClient } from '@/utils/supabase/server';
import AppShell from '@/components/lms/AppShell';
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single();

  // We don't strictly reject admins here; they might want to view the student perspective.
  return (
    <AppShell role="student" userLabel={profile?.full_name || profile?.email}>
      {children}
    </AppShell>
  );
}
