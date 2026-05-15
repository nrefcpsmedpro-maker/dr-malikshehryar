'use client';

import Link from 'next/link';
import { BookOpen, LayoutDashboard, LogOut, Video, Users, FileText, Award } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Navbar({ role }: { role?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (!role) {
     return (
       <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b min-h-16 flex items-center justify-between px-6">
         <div className="flex items-center gap-2 text-xl font-bold text-primary">
           <BookOpen className="text-primary" />
           <span>MedPro LMS</span>
         </div>
         <ThemeToggle />
       </nav>
     );
  }

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b min-h-16 flex items-center justify-between px-6">
      <div className="flex items-center gap-8">
        <Link href={role === 'admin' ? '/admin' : '/dashboard'} className="flex items-center gap-2 text-xl font-bold text-primary transition-opacity hover:opacity-80">
          <BookOpen />
          <span>MedPro LMS</span>
        </Link>

        {role === 'admin' && (
          <div className="hidden md:flex gap-4">
            <Link 
              href="/admin" 
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${pathname === '/admin' ? 'text-blue-400' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutDashboard size={18} />
              Admin Dashboard
            </Link>
             <Link 
              href="/admin/courses" 
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${pathname.includes('/admin/courses') ? 'text-blue-400' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Video size={18} />
              Manage Courses
            </Link>
             <Link 
              href="/admin/users" 
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${pathname.includes('/admin/users') ? 'text-blue-400' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Users size={18} />
              Manage Users
            </Link>
<Link
          href="/admin/tests"
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${pathname.includes('/admin/tests') ? 'text-purple-400' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <FileText size={18} />
          Course Tests
        </Link>
        <Link
          href="/admin/exams"
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${pathname.includes('/admin/exams') ? 'text-purple-400' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Award size={18} />
          Mock Exams
        </Link>
          </div>
        )}
        
        {role === 'student' && (
          <div className="hidden md:flex gap-4">
<Link
          href="/dashboard"
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${pathname === '/dashboard' ? 'text-blue-400' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <LayoutDashboard size={18} />
          My Courses
        </Link>
        <Link
          href="/dashboard/exams"
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${pathname.includes('/dashboard/exams') ? 'text-blue-400' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Award size={18} />
          Mock Exams
        </Link>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors ml-4"
        >
          <LogOut size={18} />
          <span className="hidden md:inline">Sign out</span>
        </button>
      </div>
    </nav>
  );
}
