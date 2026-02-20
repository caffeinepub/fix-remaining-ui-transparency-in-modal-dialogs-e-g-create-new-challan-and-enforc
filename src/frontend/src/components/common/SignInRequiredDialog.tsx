import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { AlertCircle, Info } from 'lucide-react';
import { useState } from 'react';

interface SignInRequiredDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Reusable sign-in prompt dialog with enhanced error handling for Internet Identity blank screen issues, retry mechanism, and user-friendly troubleshooting guidance.
 */
export default function SignInRequiredDialog({ open, onClose }: SignInRequiredDialogProps) {
  const { login, loginStatus, loginError } = useInternetIdentity();
  const [attemptCount, setAttemptCount] = useState(0);

  const handleSignIn = async () => {
    setAttemptCount((prev) => prev + 1);
    
    try {
      console.log('=== Sign-In Dialog: Login Attempt ===');
      console.log('Attempt:', attemptCount + 1);
      console.log('Timestamp:', new Date().toISOString());
      
      await login();
      
      console.log('Sign-In Dialog: Login successful');
      onClose();
    } catch (error: any) {
      console.error('=== Sign-In Dialog: Login Failed ===');
      console.error('Error:', error);
      console.error('Message:', error?.message);
      
      // Don't close dialog on error so user can see the error and retry
      if (error?.message?.includes('User is already authenticated')) {
        // If already authenticated, close the dialog
        onClose();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-background opacity-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Sign In Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You need to be signed in to perform this action. Please sign in with your Internet
            Identity to continue.
          </p>

          {loginError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {loginError.message}
              </AlertDescription>
            </Alert>
          )}

          {attemptCount > 1 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs space-y-1">
                <p className="font-semibold">Having trouble signing in?</p>
                <ul className="list-disc list-inside ml-2 space-y-0.5">
                  <li>Allow popups for this site</li>
                  <li>Enable third-party cookies</li>
                  <li>Try a different browser</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSignIn} disabled={loginStatus === 'logging-in'}>
            {loginStatus === 'logging-in' ? 'Signing In...' : 'Sign In'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
