import React from 'react';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useRequestApproval } from '../../hooks/useApprovalStatus';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, LogOut, RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ApprovalRequiredScreen() {
  const { identity, clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { mutate: requestApproval, isPending, isSuccess } = useRequestApproval();

  const principal = identity?.getPrincipal().toString() || '';

  const handleRequest = () => {
    requestApproval(undefined, {
      onSuccess: () => toast.success('Approval request submitted! Please wait for admin approval.'),
      onError: (e) => toast.error(`Failed to request approval: ${e.message}`),
    });
  };

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--sidebar-bg)' }}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--sidebar-accent)' }}
          >
            <Clock className="w-8 h-8" style={{ color: 'var(--sidebar-active)' }} />
          </div>
          <CardTitle className="text-xl">Access Pending</CardTitle>
          <CardDescription>
            Your account requires admin approval to access RentIQ Udaipur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Your Principal ID</p>
            <p className="text-xs font-mono break-all">{principal}</p>
          </div>

          {isSuccess ? (
            <div className="flex items-center gap-2 text-green-600 text-sm p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Request submitted! Please wait for admin approval.</span>
            </div>
          ) : (
            <Button
              onClick={handleRequest}
              disabled={isPending}
              className="w-full"
            >
              {isPending ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Requesting...</>
              ) : (
                'Request Access'
              )}
            </Button>
          )}

          <Button variant="outline" onClick={handleLogout} className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
