'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

type AuthMode = 'login' | 'signup';
type AuthFailure = { message: string } | null;

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [cnicNumber, setCnicNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AuthMode>('login');

  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const finish = (authError: AuthFailure) => {
      if (authError) setError(authError.message);
      else router.refresh();
    };

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }

      const isStrong =
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9]/.test(password);

      if (!isStrong) {
        setError('Use at least 8 characters with uppercase, lowercase, number, and special character.');
        setLoading(false);
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            mobile_number: mobileNumber,
            cnic_number: cnicNumber,
          },
        },
      });
      finish(signUpError);
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      finish(signInError);
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/pending`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary/40 px-5 py-10">
      <Card className="w-full max-w-md rounded-lg p-7 shadow-sm">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <GraduationCap size={25} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === 'login' ? 'Sign in to MedPro LMS' : 'Create your student account'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {mode === 'login'
              ? 'Continue your courses, exams, progress, and certificates.'
              : 'New accounts wait for administrator approval before course access opens.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {mode === 'signup' && (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="fullName">Full name</label>
              <Input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Dr. Sarah Ahmed"
              />
            </div>
          )}

          {mode === 'signup' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="mobileNumber">Mobile number</label>
                <Input
                  id="mobileNumber"
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(event) => setMobileNumber(event.target.value)}
                  placeholder="+92 300 0000000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="cnicNumber">CNIC number</label>
                <Input
                  id="cnicNumber"
                  type="text"
                  inputMode="numeric"
                  required
                  value={cnicNumber}
                  onChange={(event) => setCnicNumber(event.target.value)}
                  placeholder="35202-1234567-1"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">Email</label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">Password</label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
            />
          </div>

          {mode === 'signup' && (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="confirmPassword">Confirm password</label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your password"
              />
            </div>
          )}

          <Button type="submit" disabled={loading} className="h-11 w-full">
            {loading ? 'Processing...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={handleGoogleSignIn}
          className="h-11 w-full bg-white text-slate-800 hover:bg-slate-50 dark:bg-white dark:text-slate-800 dark:hover:bg-slate-50"
        >
          <GoogleIcon />
          <span className="ml-3">{mode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}</span>
        </Button>

        <div className="mt-6 text-center text-sm">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError(null);
            }}
            className="font-medium text-primary hover:text-primary/80"
          >
            {mode === 'login' ? 'Need an account? Request student access' : 'Already approved? Sign in'}
          </button>
        </div>
      </Card>
    </main>
  );
}
