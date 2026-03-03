import React, { useState } from 'react';
import { Shield, CheckCircle, XCircle, Clock, Users, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useIsAdmin,
  useListApprovals,
  useSetApproval,
} from '@/hooks/useAccessManagement';
import { ApprovalStatus } from '@/backend';
import type { UserApprovalInfo } from '@/backend';
import type { Principal } from '@icp-sdk/core/principal';

function PrincipalDisplay({ principal }: { principal: Principal }) {
  const str = principal.toString();
  return (
    <span className="font-mono text-xs" title={str}>
      {str.length > 20 ? `${str.slice(0, 10)}...${str.slice(-6)}` : str}
    </span>
  );
}

function StatusBadge({ status }: { status: ApprovalStatus }) {
  if (status === ApprovalStatus.approved) {
    return (
      <Badge variant="default" className="gap-1 bg-green-600">
        <CheckCircle className="h-3 w-3" />
        Approved
      </Badge>
    );
  }
  if (status === ApprovalStatus.rejected) {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Rejected
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>
  );
}

function UserRow({
  info,
  onApprove,
  onReject,
  onRevoke,
  isLoading,
}: {
  info: UserApprovalInfo;
  onApprove?: () => void;
  onReject?: () => void;
  onRevoke?: () => void;
  isLoading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b last:border-0">
      <div className="flex flex-col gap-1">
        <PrincipalDisplay principal={info.principal} />
        <StatusBadge status={info.status} />
      </div>
      <div className="flex gap-2">
        {info.status === ApprovalStatus.pending && (
          <>
            <Button
              size="sm"
              variant="default"
              onClick={onApprove}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onReject}
              disabled={isLoading}
            >
              Deny
            </Button>
          </>
        )}
        {info.status === ApprovalStatus.approved && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRevoke}
            disabled={isLoading}
          >
            Revoke
          </Button>
        )}
        {info.status === ApprovalStatus.rejected && (
          <Button
            size="sm"
            variant="outline"
            onClick={onApprove}
            disabled={isLoading}
          >
            Re-approve
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AccessManagementPage() {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: approvals, isLoading: approvalsLoading } = useListApprovals();
  const setApproval = useSetApproval();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleSetApproval = async (
    principal: Principal,
    status: ApprovalStatus
  ) => {
    const key = `${principal.toString()}-${status}`;
    setActionLoading(key);
    try {
      await setApproval.mutateAsync({ user: principal, status });
    } finally {
      setActionLoading(null);
    }
  };

  // Show loading while admin status is being determined
  if (adminLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Access Management</h1>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  // Only show "Admin Access Required" after the check has completed and returned false
  if (isAdmin === false) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Shield className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Admin Access Required</h2>
          <p className="text-muted-foreground text-center">
            You need admin privileges to manage user access.
          </p>
        </div>
      </div>
    );
  }

  const pending = approvals?.filter((a) => a.status === ApprovalStatus.pending) ?? [];
  const approved = approvals?.filter((a) => a.status === ApprovalStatus.approved) ?? [];
  const rejected = approvals?.filter((a) => a.status === ApprovalStatus.rejected) ?? [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Access Management</h1>
          <p className="text-muted-foreground text-sm">
            Manage user approvals and access control
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pending.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{approved.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{rejected.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending
            {pending.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {pending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <Users className="h-4 w-4" />
            Approved
          </TabsTrigger>
          <TabsTrigger value="denied" className="gap-2">
            <XCircle className="h-4 w-4" />
            Denied
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            Activity Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardContent className="p-0">
              {approvalsLoading ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : pending.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Clock className="h-8 w-8 mb-2" />
                  <p>No pending requests</p>
                </div>
              ) : (
                pending.map((info) => (
                  <UserRow
                    key={info.principal.toString()}
                    info={info}
                    onApprove={() =>
                      handleSetApproval(info.principal, ApprovalStatus.approved)
                    }
                    onReject={() =>
                      handleSetApproval(info.principal, ApprovalStatus.rejected)
                    }
                    isLoading={
                      actionLoading !== null
                    }
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardContent className="p-0">
              {approvalsLoading ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : approved.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="h-8 w-8 mb-2" />
                  <p>No approved users</p>
                </div>
              ) : (
                approved.map((info) => (
                  <UserRow
                    key={info.principal.toString()}
                    info={info}
                    onRevoke={() =>
                      handleSetApproval(info.principal, ApprovalStatus.rejected)
                    }
                    isLoading={actionLoading !== null}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="denied">
          <Card>
            <CardContent className="p-0">
              {approvalsLoading ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : rejected.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <XCircle className="h-8 w-8 mb-2" />
                  <p>No denied users</p>
                </div>
              ) : (
                rejected.map((info) => (
                  <UserRow
                    key={info.principal.toString()}
                    info={info}
                    onApprove={() =>
                      handleSetApproval(info.principal, ApprovalStatus.approved)
                    }
                    isLoading={actionLoading !== null}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mb-2" />
                <p>Activity log coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
