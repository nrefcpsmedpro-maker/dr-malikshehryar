import { createClient } from '@/utils/supabase/server';
import AppShell from '@/components/lms/AppShell';
import { redirect } from 'next/navigation';

import { cookies } from 'next/headers';

export default async function AdminLayout({
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

  // Get user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <AppShell role="admin" userLabel={profile.full_name || profile.email}>
      {children}
    </AppShell>
  );
}
