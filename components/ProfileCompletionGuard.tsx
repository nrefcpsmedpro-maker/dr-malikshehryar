'use client';

import { useState, useEffect } from 'react';
import { UserCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

type ProfileData = {
  full_name: string | null;
  mobile_number: string | null;
  cnic_number: string | null;
};

function normalizeCnic(value: string) {
  return value.replace(/\D/g, '');
}

export default function ProfileCompletionGuard({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [cnicNumber, setCnicNumber] = useState('');

  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('full_name, mobile_number, cnic_number')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
        setMobileNumber(data.mobile_number || '');
        setCnicNumber(data.cnic_number || '');
      }
      setLoading(false);
    };

    fetchProfile();
  }, [supabase]);

  const isComplete = profile?.full_name && profile?.mobile_number && profile?.cnic_number;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const normalizedCnic = normalizeCnic(cnicNumber);

    if (normalizedCnic.length !== 13) {
      setError('CNIC must contain exactly 13 digits.');
      setSaving(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Session expired. Please refresh the page.');
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        mobile_number: mobileNumber.trim(),
        cnic_number: normalizedCnic,
      })
      .eq('id', user.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setProfile({
      full_name: fullName.trim(),
      mobile_number: mobileNumber.trim(),
      cnic_number: normalizedCnic,
    });
    setSaving(false);
  };

  if (loading) {
    return <>{children}</>;
  }

  if (isComplete) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg rounded-lg p-7 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserCheck size={25} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Complete Your Profile</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Please provide your personal details to continue. This is required for account verification and certificate generation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="profile-fullName">Full name *</label>
            <Input
              id="profile-fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Dr. Sarah Ahmed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="profile-mobile">Mobile number *</label>
            <Input
              id="profile-mobile"
              type="tel"
              required
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="+92 300 0000000"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="profile-cnic">CNIC number *</label>
            <Input
              id="profile-cnic"
              type="text"
              inputMode="numeric"
              required
              value={cnicNumber}
              onChange={(e) => setCnicNumber(e.target.value)}
              placeholder="35202-1234567-1"
            />
            <p className="text-xs text-muted-foreground">Enter 13 digits without dashes</p>
          </div>

          <Button type="submit" disabled={saving} className="h-11 w-full">
            {saving ? 'Saving...' : 'Save & Continue'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
