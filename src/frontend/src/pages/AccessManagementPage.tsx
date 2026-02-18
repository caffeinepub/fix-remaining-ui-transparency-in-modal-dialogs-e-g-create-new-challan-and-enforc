import { useState } from 'react';
import { useDerivedApprovalLists, useSetApproval, useIsAdmin } from '../hooks/useAccessManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertCircle, ShieldAlert } from 'lucide-react';
import { Principal } from '@dfinity/principal';
import { ApprovalStatus } from '../backend';

/**
 * Admin-only page for managing user access approvals.
 * Displays pending requests and approved users from both Admin and Staff/Company hostnames.
 */
export default function AccessManagementPage() {
  const { data: isAdmin, isLoading: adminCheckLoading } = useIsAdmin();
  const { pending, approved, isLoading: approvalsLoading, refetch } = useDerivedApprovalLists();
  const setApprovalMutation = useSetApproval();
  const [processingUser, setProcessingUser] = useState<string | null>(null);

  const handleSetApproval = async (user: Principal, status: ApprovalStatus) => {
    setProcessingUser(user.toString());
    try {
      await setApprovalMutation.mutateAsync({ user, status });
      // Refetch the list after a short delay to ensure backend state is updated
      setTimeout(() => refetch(), 500);
    } catch (error) {
      console.error('Failed to set approval:', error);
    } finally {
      setProcessingUser(null);
    }
  };

  // Show loading state while checking admin status
  if (adminCheckLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
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
      <div>
        <h1 className="text-3xl font-bold">Access Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage user access requests and approvals for RENTIQ
        </p>
      </div>

      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Pending Requests
            {pending.length > 0 && (
              <Badge variant="secondary">{pending.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Users waiting for approval to access the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          {approvalsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pending.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No pending requests</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Principal ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((approval) => {
                  const principalStr = approval.principal.toString();
                  const isProcessing = processingUser === principalStr;

                  return (
                    <TableRow key={principalStr}>
                      <TableCell className="font-mono text-sm">
                        {principalStr.slice(0, 20)}...{principalStr.slice(-8)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Pending</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleSetApproval(approval.principal, ApprovalStatus.approved)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleSetApproval(approval.principal, ApprovalStatus.rejected)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approved Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Approved Users
            {approved.length > 0 && (
              <Badge variant="secondary">{approved.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Users with active access to the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          {approvalsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : approved.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No approved users</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Principal ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approved.map((approval) => {
                  const principalStr = approval.principal.toString();
                  const isProcessing = processingUser === principalStr;

                  return (
                    <TableRow key={principalStr}>
                      <TableCell className="font-mono text-sm">
                        {principalStr.slice(0, 20)}...{principalStr.slice(-8)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-600">
                          Approved
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleSetApproval(approval.principal, ApprovalStatus.rejected)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 mr-1" />
                              Revoke Access
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {setApprovalMutation.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {setApprovalMutation.error instanceof Error
              ? setApprovalMutation.error.message
              : 'Failed to update approval status. Please try again.'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
