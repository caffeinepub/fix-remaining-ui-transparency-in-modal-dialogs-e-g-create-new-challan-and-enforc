import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";

interface SignInRequiredDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Dialog prompting the user to sign in via Internet Identity before performing restricted actions.
 */
export default function SignInRequiredDialog({
  open,
  onClose,
}: SignInRequiredDialogProps) {
  const { login, loginStatus } = useInternetIdentity();

  const handleLogin = async () => {
    try {
      await login();
      onClose();
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const isLoggingIn = loginStatus === "logging-in";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-background opacity-100">
        <DialogHeader>
          <DialogTitle>Sign In Required</DialogTitle>
          <DialogDescription>
            You need to sign in with Internet Identity to perform this action.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoggingIn}>
            Cancel
          </Button>
          <Button onClick={handleLogin} disabled={isLoggingIn}>
            {isLoggingIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
