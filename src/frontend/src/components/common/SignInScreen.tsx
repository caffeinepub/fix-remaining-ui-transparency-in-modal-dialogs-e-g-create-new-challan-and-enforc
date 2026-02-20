import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, LogIn, AlertCircle, ExternalLink } from 'lucide-react';
import { useAppMode } from '../../hooks/useAppMode';
import { useState, useEffect } from 'react';

/**
 * Full-page sign-in screen with enhanced Internet Identity diagnostics, error handling for blank authorization screens, domain-aware messaging, and troubleshooting guidance for authentication failures.
 */
export default function SignInScreen() {
  const { login, loginStatus, loginError } = useInternetIdentity();
  const { isAdminDomain, mode } = useAppMode();
  const [diagnosticInfo, setDiagnosticInfo] = useState<string>('');
  const [authAttempts, setAuthAttempts] = useState(0);

  const isLoggingIn = loginStatus === 'logging-in';
  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'unknown';

  useEffect(() => {
    // Capture diagnostic information
    const info = [
      `Domain: ${currentDomain}`,
      `Mode: ${mode}`,
      `User Agent: ${navigator.userAgent.substring(0, 50)}...`,
      `Cookies Enabled: ${navigator.cookieEnabled}`,
      `Third-party Cookies: ${'hasStorageAccess' in document ? 'Supported' : 'Unknown'}`,
    ].join('\n');
    setDiagnosticInfo(info);
  }, [currentDomain, mode]);

  const handleLogin = async () => {
    setAuthAttempts((prev) => prev + 1);
    
    try {
      console.log('=== Internet Identity Login Attempt ===');
      console.log('Domain:', currentDomain);
      console.log('Mode:', mode);
      console.log('Attempt:', authAttempts + 1);
      console.log('Timestamp:', new Date().toISOString());
      
      await login();
      
      console.log('Login successful');
    } catch (error: any) {
      console.error('=== Internet Identity Login Failed ===');
      console.error('Error:', error);
      console.error('Error Message:', error?.message);
      console.error('Error Stack:', error?.stack);
      
      // Log specific error types
      if (error?.message?.includes('popup') || error?.message?.includes('blocked')) {
        console.error('DIAGNOSIS: Popup blocker may be preventing authentication window');
      } else if (error?.message?.includes('timeout')) {
        console.error('DIAGNOSIS: Authentication window timed out or failed to load');
      } else if (error?.message?.includes('User is already authenticated')) {
        console.error('DIAGNOSIS: Stale authentication state detected');
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">RENTIQ</CardTitle>
          <CardDescription>
            {isAdminDomain ? 'Admin Portal' : 'Staff Portal'} - Sign in to access your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            This application requires authentication. Please sign in using Internet Identity to continue.
          </p>

          {loginError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Authentication Failed</AlertTitle>
              <AlertDescription className="space-y-2">
                <p className="text-sm">{loginError.message}</p>
                {authAttempts > 1 && (
                  <p className="text-xs">
                    Attempt {authAttempts} failed. If you see a blank screen, try:
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {authAttempts > 2 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Troubleshooting Tips</AlertTitle>
              <AlertDescription className="space-y-2 text-xs">
                <p className="font-semibold">If you see a blank authorization screen:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Disable popup blockers for this site</li>
                  <li>Enable third-party cookies in browser settings</li>
                  <li>Try a different browser (Chrome, Firefox, Safari)</li>
                  <li>Clear browser cache and cookies</li>
                  <li>Check if you're using incognito/private mode</li>
                </ul>
                <p className="mt-2">
                  <strong>Current domain:</strong> {currentDomain}
                </p>
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full"
            size="lg"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4 mr-2" />
                Sign In with Internet Identity
              </>
            )}
          </Button>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              Internet Identity uses secure passkeys and supports Google, Apple, and Microsoft sign-in.
            </p>
            
            {authAttempts > 0 && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">
                  View diagnostic information
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-[10px] overflow-x-auto">
                  {diagnosticInfo}
                </pre>
              </details>
            )}
          </div>

          <div className="pt-2 border-t">
            <a
              href="https://identity.ic0.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center justify-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Learn more about Internet Identity
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
