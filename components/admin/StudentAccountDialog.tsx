'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { FileSpreadsheet, UserPlus, X } from 'lucide-react';

import { generateUser } from '@/app/admin/users/actions';
import { BulkStudentImport } from '@/components/admin/BulkStudentImport';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/cn';

type CourseOption = {
  id: string;
  title: string;
};

type AccountMode = 'single' | 'bulk';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="destructive" className="mt-2 w-full" disabled={pending}>
      {pending ? 'Creating Account...' : 'Generate & Approve'}
    </Button>
  );
}

export function StudentAccountDialog({ courses }: { courses: CourseOption[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AccountMode>('single');

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <UserPlus className="mr-2 size-4" />
        Generate Account
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border p-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Create Student Accounts</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Generate one approved account or import a CSV batch with course enrollment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Close account creation dialog"
              >
                <X size={20} />
              </button>
            </div>

            <div className="shrink-0 border-b border-border px-6 py-4">
              <div className="grid grid-cols-2 gap-2 rounded-md bg-secondary/50 p-1">
                <button
                  type="button"
                  aria-pressed={mode === 'single'}
                  onClick={() => setMode('single')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors',
                    mode === 'single'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <UserPlus className="size-4" />
                  One Account
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'bulk'}
                  onClick={() => setMode('bulk')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors',
                    mode === 'bulk'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <FileSpreadsheet className="size-4" />
                  Bulk Import
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {mode === 'single' ? (
                <form action={generateUser} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Full Name
                      </label>
                      <Input type="text" name="fullName" required placeholder="Dr. Sarah Ahmed" />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Email Address
                      </label>
                      <Input type="email" name="email" required placeholder="sarah@example.com" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Mobile Number
                      </label>
                      <Input type="tel" name="mobileNumber" required placeholder="+92 300 0000000" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        CNIC Number
                      </label>
                      <Input type="text" inputMode="numeric" name="cnicNumber" required placeholder="35202-1234567-1" />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Temporary Password
                      </label>
                      <Input type="password" name="password" required placeholder="Minimum 6 characters" />
                    </div>
                  </div>

                  <div className="rounded-md bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                    The account is approved immediately. Course access can be assigned from the student row after creation.
                  </div>
                  <SubmitButton />
                </form>
              ) : (
                <BulkStudentImport courses={courses} embedded />
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
