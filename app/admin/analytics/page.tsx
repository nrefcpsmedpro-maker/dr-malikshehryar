import { cookies } from 'next/headers';
import { Award, BookOpen, CheckCircle2, Mail, PlayCircle, Users } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { PageHeader } from '@/components/lms/PageHeader';
import { StatCard } from '@/components/lms/StatCard';
import { StatusBadge } from '@/components/lms/StatusBadge';
import { Card } from '@/components/ui/card';
import type { MarketingLead } from '@/types/lms';

export default async function AdminAnalyticsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [
    { count: courseCount },
    { count: studentCount },
    { count: approvedStudentCount },
    { count: progressCount },
    { count: completedProgressCount },
    { count: certificateCount },
    { data: leadsData },
  ] = await Promise.all([
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student').eq('is_approved', true),
    supabase.from('lesson_progress').select('*', { count: 'exact', head: true }),
    supabase.from('lesson_progress').select('*', { count: 'exact', head: true }).not('completed_at', 'is', null),
    supabase.from('certificates').select('*', { count: 'exact', head: true }),
    supabase.from('marketing_leads').select('*').order('created_at', { ascending: false }).limit(8),
  ]);

  const leads = (leadsData ?? []) as MarketingLead[];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Academy intelligence"
        title="Analytics"
        description="Review learning activity, student approval, certificate output, and marketing demand."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Courses" value={courseCount ?? 0} detail="Academy course catalog" icon={BookOpen} />
        <StatCard label="Approved students" value={`${approvedStudentCount ?? 0}/${studentCount ?? 0}`} detail="Student access status" icon={Users} tone="emerald" />
        <StatCard label="Progress events" value={progressCount ?? 0} detail={`${completedProgressCount ?? 0} completed lessons`} icon={PlayCircle} tone="amber" />
        <StatCard label="Certificates" value={certificateCount ?? 0} detail="Issued completions" icon={Award} tone="violet" />
        <StatCard label="Marketing leads" value={leads.length} detail="Recent access requests shown below" icon={Mail} tone="primary" />
        <StatCard label="Lesson completions" value={completedProgressCount ?? 0} detail="Completed video lessons" icon={CheckCircle2} tone="emerald" />
      </div>

      <Card className="rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Recent marketing leads</h2>
            <p className="mt-1 text-sm text-muted-foreground">Requests submitted from the public academy page.</p>
          </div>
          <StatusBadge variant="info">{leads.length} shown</StatusBadge>
        </div>

        <div className="mt-6 overflow-x-auto rounded-lg border">
          <div className="grid min-w-[480px] grid-cols-[1fr_1fr_1fr] bg-secondary px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <span>Name</span>
            <span>Interest</span>
            <span>Submitted</span>
          </div>
          {leads.length ? (
            leads.map((lead) => (
              <div key={lead.id} className="grid min-w-[480px] grid-cols-[1fr_1fr_1fr] gap-4 border-t bg-background px-4 py-4 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{lead.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{lead.email}</p>
                </div>
                <p className="truncate text-muted-foreground">{lead.goal.replaceAll('_', ' ')}</p>
                <p className="text-muted-foreground">{new Date(lead.created_at).toLocaleDateString()}</p>
              </div>
            ))
          ) : (
            <p className="border-t bg-background p-6 text-sm text-muted-foreground">No marketing leads captured yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
