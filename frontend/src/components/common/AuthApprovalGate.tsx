import React from 'react';
import { useAppMode } from '../../hooks/useAppMode';
import { useApprovalStatus, useIsCallerAdmin } from '../../hooks/useApprovalStatus';
import ApprovalRequiredScreen from './ApprovalRequiredScreen';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  children: React.ReactNode;
}

export default function AuthApprovalGate({ children }: Props) {
  const { isAdminDomain } = useAppMode();
  const { isApproved, isLoading: approvalLoading, isFetched } = useApprovalStatus();
  const { isAdmin, isLoading: adminLoading } = useIsCallerAdmin();

  // Admin domain: bypass approval entirely
  if (isAdminDomain) {
    return <>{children}</>;
  }

  // User portal: check approval
  if (approvalLoading || adminLoading || !isFetched) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--sidebar-bg)' }}>
        <div className="text-center space-y-3">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
          <p style={{ color: 'var(--sidebar-muted)' }} className="text-xs mt-2">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!isApproved && !isAdmin) {
    return <ApprovalRequiredScreen />;
  }

  return <>{children}</>;
}
