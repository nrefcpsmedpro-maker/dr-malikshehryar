import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { UserCheck, UserX, ShieldAlert, UserPlus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default async function AdminUsersPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: users, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  // --- SERVER ACTIONS ---

  const toggleApproval = async (formData: FormData) => {
    'use server';
    const userId = formData.get('userId') as string;
    const isApproved = formData.get('currentStatus') === 'true';

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    await supabase
      .from('profiles')
      .update({ is_approved: !isApproved })
      .eq('id', userId);

    revalidatePath('/admin/users');
  };

  const generateUser = async (formData: FormData) => {
    'use server';
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    
    const adminClient = createAdminClient();
    
    const { data: newUser, error } = await adminClient.auth.admin.createUser({
       email,
       password,
       email_confirm: true,
       user_metadata: { full_name: fullName }
    });

    if (newUser.user?.id) {
       const cookieStore = await cookies();
       const supabaseUserClient = createClient(cookieStore);
       
       await supabaseUserClient.from('profiles').update({ is_approved: true }).eq('id', newUser.user.id);
    }

    if (error) console.error("Error creating user:", error.message);
    revalidatePath('/admin/users');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">
          Approve or reject student registrations, and forcefully generate new accounts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFTSIDE: User List & Approvals */}
        <section className="lg:col-span-2 space-y-4">
           {users?.map((user: any) => (
             <Card key={user.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                   <h4 className="font-bold text-lg">{user.full_name || 'No Name'}</h4>
                   <p className="text-sm text-muted-foreground">{user.email}</p>
                   
                   <div className="flex gap-2 mt-2">
                      <span className="text-xs font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                         {user.role}
                      </span>
                      {user.is_approved ? (
                         <span className="text-xs font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">Approved</span>
                      ) : (
                         <span className="text-xs font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-500">Pending</span>
                      )}
                   </div>
                </div>
                
                {user.role !== 'admin' && (
                  <form action={toggleApproval}>
                     <input type="hidden" name="userId" value={user.id} />
                     <input type="hidden" name="currentStatus" value={user.is_approved ? 'true' : 'false'} />
                     
                     {user.is_approved ? (
                        <Button type="submit" variant="outline" className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10">
                           <UserX size={16} className="mr-2" /> Revoke Access
                        </Button>
                     ) : (
                        <Button type="submit" variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                           <UserCheck size={16} className="mr-2" /> Approve Student
                        </Button>
                     )}
                  </form>
                )}
             </Card>
           ))}
           {!users?.length && (
              <p className="p-8 text-center text-muted-foreground">No users found.</p>
           )}
        </section>

        {/* RIGHTSIDE: Generate User Form */}
        <section className="space-y-6">
           <Card className="p-6 h-fit sticky top-8">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                 <ShieldAlert className="text-destructive" />
                 Generate Account
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                 Bypass the waiting room. Generate an explicitly approved student account directly.
              </p>
              
              <form action={generateUser} className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</label>
                    <Input type="text" name="fullName" required placeholder="Dr. Sarah" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
                    <Input type="email" name="email" required placeholder="sarah@medpro.com" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Temporary Password</label>
                    <Input type="password" name="password" required placeholder="••••••••" />
                 </div>
                 
                 <Button type="submit" variant="destructive" className="w-full mt-4">
                    Generate & Approve
                 </Button>
              </form>
           </Card>
        </section>

      </div>
    </div>
  );
}
