import { ReactNode, useEffect } from 'react';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useIsCallerApproved, useIsCallerAdmin } from '../../hooks/useApprovalStatus';
import { useBootstrapAdmin } from '../../hooks/useBootstrapAdmin';
import { useAppMode } from '../../hooks/useAppMode';
import SignInScreen from './SignInScreen';
import ApprovalRequiredScreen from './ApprovalRequiredScreen';

interface AuthApprovalGateProps {
  children: ReactNode;
}

/**
 * Global gate that blocks routes until the user is authenticated and approved or admin,
 * with auto-bootstrap on admin domains.
 */
export default function AuthApprovalGate({ children }: AuthApprovalGateProps) {
  const { identity, isInitializing } = useInternetIdentity();
  const { isAdminDomain } = useAppMode();
  const { data: isApproved, isLoading: approvalLoading } = useIsCallerApproved();
  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();
  const { bootstrapAdmin, isBootstrapping } = useBootstrapAdmin();

  // Auto-bootstrap admin on first login from admin domain
  useEffect(() => {
    if (identity && isAdminDomain && !adminLoading && !isAdmin && !isBootstrapping) {
      bootstrapAdmin();
    }
  }, [identity, isAdminDomain, isAdmin, adminLoading, isBootstrapping, bootstrapAdmin]);

  // Show loading while initializing identity
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show sign-in screen
  if (!identity) {
    return <SignInScreen />;
  }

  // Show loading while checking approval status
  if (approvalLoading || adminLoading || isBootstrapping) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Authenticated but not approved and not admin - show approval required screen
  if (!isApproved && !isAdmin) {
    return <ApprovalRequiredScreen />;
  }

  // Authenticated and approved or admin - render children
  return <>{children}</>;
}
