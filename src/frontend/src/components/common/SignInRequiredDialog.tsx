import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { AlertCircle } from 'lucide-react';

interface SignInRequiredDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function SignInRequiredDialog({ open, onClose }: SignInRequiredDialogProps) {
  const { login, loginStatus } = useInternetIdentity();

  const handleSignIn = async () => {
    try {
      await login();
      onClose();
    } catch (error) {
      console.error('Sign-in error:', error);
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
