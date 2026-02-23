import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useRequestApproval, useIsCallerApproved } from '../../hooks/useApprovalStatus';
import { Loader2, Clock, CheckCircle2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Full-page screen for logged-in but unapproved users to request access,
 * view status, or sign out, with auto-refresh of approval status.
 */
export default function ApprovalRequiredScreen() {
  const { identity, clear } = useInternetIdentity();
  const { mutate: requestApproval, isPending, isSuccess } = useRequestApproval();
  const { refetch } = useIsCallerApproved();
  const queryClient = useQueryClient();

  // Auto-refresh approval status every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);

    return () => clearInterval(interval);
  }, [refetch]);

  const handleSignOut = async () => {
    await clear();
    queryClient.clear();
  };

  const principalId = identity?.getPrincipal().toString() || '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary mb-2">RENTIQ</CardTitle>
          <CardDescription>Approval Required</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Your account is pending approval. An administrator will review your request shortly.
            </AlertDescription>
          </Alert>

          {isSuccess && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Approval request submitted successfully. Please wait for administrator approval.
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-muted p-3 rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Your Principal ID:</p>
            <p className="text-xs font-mono break-all">{principalId}</p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => requestApproval()}
              disabled={isPending || isSuccess}
              className="w-full"
              variant="default"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Requesting...
                </>
              ) : isSuccess ? (
                'Request Submitted'
              ) : (
                'Request Approval'
              )}
            </Button>

            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full"
            >
              Sign Out
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            This page will automatically update when your approval is granted.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
