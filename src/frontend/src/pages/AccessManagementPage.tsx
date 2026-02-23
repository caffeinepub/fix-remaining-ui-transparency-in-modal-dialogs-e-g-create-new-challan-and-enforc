import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useIsAdmin, useDerivedApprovalLists, useSetApproval } from '../hooks/useAccessManagement';
import { ShieldAlert, UserCheck, UserX, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { Principal } from '@dfinity/principal';
import { ApprovalStatus } from '../backend';

/**
 * Admin-only page for viewing and managing user approval requests.
 */
export default function AccessManagementPage() {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { pending, approved, isLoading: approvalsLoading, refetch } = useDerivedApprovalLists();
  const setApproval = useSetApproval();
  const [processingUser, setProcessingUser] = useState<string | null>(null);

  const handleApprove = async (user: Principal) => {
    setProcessingUser(user.toString());
    try {
      await setApproval.mutateAsync({ user, status: ApprovalStatus.approved });
      toast.success('User approved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve user');
    } finally {
      setProcessingUser(null);
    }
  };

  const handleReject = async (user: Principal) => {
    setProcessingUser(user.toString());
    try {
      await setApproval.mutateAsync({ user, status: ApprovalStatus.rejected });
      toast.success('User rejected');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject user');
    } finally {
      setProcessingUser(null);
    }
  };

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to access this page. Only administrators can manage user approvals.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Access Management</h1>
          <p className="text-muted-foreground mt-1">Manage user access and approvals</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {approvalsLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Pending Approvals */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals ({pending.length})</CardTitle>
              <CardDescription>Users waiting for access approval</CardDescription>
            </CardHeader>
            <CardContent>
              {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No pending approval requests
                </p>
              ) : (
                <div className="space-y-3">
                  {pending.map((approval) => (
                    <div
                      key={approval.principal.toString()}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono truncate">{approval.principal.toString()}</p>
                        <Badge variant="outline" className="mt-1">
                          Pending
                        </Badge>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(approval.principal)}
                          disabled={processingUser === approval.principal.toString()}
                        >
                          {processingUser === approval.principal.toString() ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(approval.principal)}
                          disabled={processingUser === approval.principal.toString()}
                        >
                          {processingUser === approval.principal.toString() ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <UserX className="h-4 w-4 mr-1" />
                              Reject
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approved Users */}
          <Card>
            <CardHeader>
              <CardTitle>Approved Users ({approved.length})</CardTitle>
              <CardDescription>Users with active access</CardDescription>
            </CardHeader>
            <CardContent>
              {approved.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No approved users yet
                </p>
              ) : (
                <div className="space-y-3">
                  {approved.map((approval) => (
                    <div
                      key={approval.principal.toString()}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono truncate">{approval.principal.toString()}</p>
                        <Badge className="mt-1">Approved</Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(approval.principal)}
                        disabled={processingUser === approval.principal.toString()}
                      >
                        {processingUser === approval.principal.toString() ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Revoke Access'
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
