"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Award,
  BarChart3,
  BookOpen,
  FileQuestion,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/utils/cn";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const studentNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/exams", label: "Mock Exams", icon: FileQuestion },
  { href: "/dashboard/certificates", label: "Certificates", icon: Award },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/users", label: "Students", icon: Users },
  { href: "/admin/tests", label: "Course Tests", icon: FileQuestion },
  { href: "/admin/exams", label: "Mock Exams", icon: Award },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export default function AppShell({
  role,
  children,
  userLabel,
}: {
  role: "student" | "admin";
  children: React.ReactNode;
  userLabel?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const nav = role === "admin" ? adminNav : studentNav;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const navContent = (
    <>
      <div className="flex items-center gap-3 px-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <GraduationCap size={24} />
        </div>
        <div>
          <p className="text-base font-semibold leading-tight">MedPro LMS</p>
          <p className="text-xs text-muted-foreground">Medical Academy</p>
        </div>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {nav.map((item) => {
          const isRootItem = item.href === "/admin" || item.href === "/dashboard";
          const active = pathname === item.href || (!isRootItem && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 space-y-4 rounded-lg border bg-card p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 text-emerald-600 dark:text-emerald-300" size={18} />
          <div>
            <p className="text-sm font-semibold">{role === "admin" ? "Admin workspace" : "Protected learning"}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {role === "admin"
                ? "Manage courses, access, exams, and performance."
                : "Your lessons, exams, and certificates stay in one place."}
            </p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-secondary/30">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r bg-background/95 p-5 backdrop-blur lg:flex">
        {navContent}
        <div className="mt-6 flex items-center justify-between gap-3 border-t pt-5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{userLabel || (role === "admin" ? "Administrator" : "Student")}</p>
            <p className="text-xs capitalize text-muted-foreground">{role}</p>
          </div>
          <ThemeToggle />
        </div>
        <Button variant="ghost" className="mt-3 justify-start text-muted-foreground hover:text-destructive" onClick={handleLogout}>
          <LogOut size={17} className="mr-2" />
          Sign out
        </Button>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-card"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <Link href={role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-2 font-semibold">
          <GraduationCap className="text-primary" size={22} />
          MedPro LMS
        </Link>
        <ThemeToggle />
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(21rem,90vw)] flex-col border-r bg-background p-5 shadow-xl">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg border"
            >
              <X size={18} />
            </button>
            {navContent}
            <Button variant="ghost" className="mt-5 justify-start text-muted-foreground hover:text-destructive" onClick={handleLogout}>
              <LogOut size={17} className="mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 lg:ml-72 lg:px-8 lg:py-10">
        {children}
      </main>
    </div>
  );
}
