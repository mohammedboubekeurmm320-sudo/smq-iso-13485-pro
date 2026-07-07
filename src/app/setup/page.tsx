// src/app/setup/page.tsx
// ============================================================================
// Onboarding wizard — for users without an organization.
// ============================================================================

'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, AlertCircle, ArrowRight } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const { user, profile, refreshSession } = useAuth();

  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!orgName.trim()) {
      setError('Organization name is required');
      return;
    }

    if (orgName.trim().length < 2) {
      setError('Organization name must be at least 2 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/organizations/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: orgName.trim(),
          settings: {
            // Default settings
            email_notifications: true,
            due_date_reminders: true,
            approval_requests: true,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to create organization');
        setLoading(false);
        return;
      }

      // Refresh the auth session to pick up the new org
      await refreshSession();

      // Redirect to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      console.error('[Setup] error:', err);
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Create Your Organization</CardTitle>
          <CardDescription className="text-center">
            Welcome {profile?.fullName || user?.email || ''}. Create your first organization to get started.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                type="text"
                placeholder="e.g. Acme Medical Devices"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={loading}
                autoFocus
                required
              />
              <p className="text-xs text-muted-foreground">
                A unique slug will be auto-generated from the name (e.g. &quot;acme-medical-devices&quot;).
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !orgName.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating organization...
                </>
              ) : (
                <>
                  Create Organization
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Your organization will be isolated from others via Row-Level Security (RLS).
              <br />
              ISO 13485 · 21 CFR Part 11 compliant.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}