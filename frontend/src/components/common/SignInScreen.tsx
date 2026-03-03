import React from 'react';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function SignInScreen() {
  const { login, loginStatus } = useInternetIdentity();
  const isLoggingIn = loginStatus === 'logging-in';

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--sidebar-bg)' }}>
      <div className="text-center max-w-sm w-full px-6">
        {/* Logo */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4" style={{ background: 'var(--sidebar-accent)' }}>
            <span className="text-3xl font-bold" style={{ color: 'var(--sidebar-active)' }}>R</span>
          </div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--sidebar-fg)' }}>RentIQ</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--sidebar-muted)' }}>Udaipur Equipment Rental</p>
        </div>

        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--sidebar-accent)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--sidebar-fg)' }}>Sign In</h2>
          <p className="text-sm" style={{ color: 'var(--sidebar-muted)' }}>
            Use Internet Identity to securely access your account.
          </p>
          <Button
            onClick={() => login()}
            disabled={isLoggingIn}
            className="w-full"
            size="lg"
            style={{ background: 'var(--sidebar-active)', color: 'var(--sidebar-active-fg)' }}
          >
            {isLoggingIn ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
            ) : (
              'Sign In with Internet Identity'
            )}
          </Button>
        </div>

        <p className="text-xs mt-6" style={{ color: 'var(--sidebar-muted)' }}>
          Secure authentication powered by the Internet Computer
        </p>
      </div>
    </div>
  );
}
