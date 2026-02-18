import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Loader2, LogOut, Clock } from 'lucide-react';
import { useRequestApproval, useIsCallerApproved } from '../../hooks/useApprovalStatus';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Full-page screen for authenticated but unapproved users.
 * Shows approval status, request access action, and sign-out option.
 * Automatically refreshes approval status and grants access when approved.
 */
export default function ApprovalRequiredScreen() {
  const requestApproval = useRequestApproval();
  const { data: isApproved, refetch } = useIsCallerApproved();
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const [hasRequested, setHasRequested] = useState(false);

  const handleRequestAccess = async () => {
    try {
      await requestApproval.mutateAsync();
      setHasRequested(true);
      // Refetch approval status after requesting
      setTimeout(() => refetch(), 1000);
    } catch (error) {
      console.error('Failed to request approval:', error);
    }
  };

  const handleSignOut = async () => {
    await clear();
    queryClient.clear();
  };

  // If approved, this screen should not be shown (gate will render app)
  // But we show a brief message while transitioning
  if (isApproved) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
          <p className="text-lg font-semibold">Access Granted!</p>
          <p className="text-sm text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Approval Required</CardTitle>
          <CardDescription className="text-center">
            Your account is pending approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {requestApproval.isSuccess || hasRequested ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Your access request has been submitted successfully!
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              An administrator has been notified of your request. You will be able to access the
              application once your request is approved.
            </p>
            <p>
              Please check back later or contact an administrator if you need immediate access.
            </p>
          </div>

          {requestApproval.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {requestApproval.error instanceof Error
                  ? requestApproval.error.message
                  : 'Failed to submit request. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          <div className="pt-4 border-t space-y-2">
            {!hasRequested && !requestApproval.isSuccess ? (
              <Button
                onClick={handleRequestAccess}
                disabled={requestApproval.isPending}
                className="w-full"
              >
                {requestApproval.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting Request...
                  </>
                ) : (
                  'Request Access'
                )}
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Waiting for approval...</span>
              </div>
            )}
            <Button onClick={handleSignOut} variant="outline" className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
