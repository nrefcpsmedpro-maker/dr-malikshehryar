'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState<boolean | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setValidSession(!!session);
    };
    checkSession();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    const isStrong =
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password);

    if (!isStrong) {
      setError('Password must include uppercase, lowercase, number, and special character.');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    setTimeout(() => {
      router.push('/dashboard');
    }, 2000);
  };

  if (validSession === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-secondary/40 px-5 py-10">
        <Card className="w-full max-w-md rounded-lg p-7 shadow-sm text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Verifying reset link...</p>
        </Card>
      </main>
    );
  }

  if (!validSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-secondary/40 px-5 py-10">
        <Card className="w-full max-w-md rounded-lg p-7 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle size={25} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Invalid or expired link</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Button asChild className="mt-6 w-full">
            <Link href="/forgot-password">Request new reset link</Link>
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary/40 px-5 py-10">
      <Card className="w-full max-w-md rounded-lg p-7 shadow-sm">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <GraduationCap size={25} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Create new password</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Enter your new password below. Make sure it&apos;s strong and memorable.
          </p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <CheckCircle2 className="mx-auto text-emerald-600 dark:text-emerald-300" size={24} />
              <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Password updated successfully!
              </p>
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                Redirecting you to your dashboard...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">New password</label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="confirmPassword">Confirm password</label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
              />
            </div>

            <Button type="submit" disabled={loading} className="h-11 w-full">
              {loading ? 'Updating...' : 'Update password'}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </div>
      </Card>
    </main>
  );
}
