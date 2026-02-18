import { ReactNode, useEffect, useState } from 'react';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useIsCallerApproved, useIsCallerAdmin } from '../../hooks/useApprovalStatus';
import { useActor } from '../../hooks/useActor';
import { useBootstrapAdmin } from '../../hooks/useBootstrapAdmin';
import { useAppMode } from '../../hooks/useAppMode';
import SignInScreen from './SignInScreen';
import ApprovalRequiredScreen from './ApprovalRequiredScreen';
import QueryErrorState from './QueryErrorState';
import { Loader2 } from 'lucide-react';

interface AuthApprovalGateProps {
  children: ReactNode;
}

/**
 * Global authentication and approval gate.
 * Blocks all routes until the user is signed in AND (approved OR admin).
 * On admin domain, attempts to bootstrap the first admin automatically.
 */
export default function AuthApprovalGate({ children }: AuthApprovalGateProps) {
  const { identity, loginStatus } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const { isAdminDomain } = useAppMode();
  const { data: isApproved, isLoading: approvalLoading, isFetched: approvalFetched, refetch: refetchApproval } = useIsCallerApproved();
  const { data: isAdmin, isLoading: adminLoading, isFetched: adminFetched, refetch: refetchAdmin } = useIsCallerAdmin();
  const { bootstrapAdmin, isBootstrapping, isSuccess: bootstrapSuccess, isError: bootstrapError, error: bootstrapErrorObj, data: bootstrapData, retry: retryBootstrap } = useBootstrapAdmin();

  const [bootstrapAttempted, setBootstrapAttempted] = useState(false);

  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();
  const isInitializing = loginStatus === 'initializing';

  // Attempt bootstrap on admin domain once authenticated and actor is ready
  useEffect(() => {
    if (
      isAdminDomain &&
      isAuthenticated &&
      actor &&
      !actorFetching &&
      !bootstrapAttempted &&
      !isBootstrapping &&
      !bootstrapSuccess
    ) {
      setBootstrapAttempted(true);
      bootstrapAdmin(true);
    }
  }, [isAdminDomain, isAuthenticated, actor, actorFetching, bootstrapAttempted, isBootstrapping, bootstrapSuccess, bootstrapAdmin]);

  // Refetch admin/approval status after successful bootstrap
  useEffect(() => {
    if (bootstrapSuccess && bootstrapData?.success) {
      refetchAdmin();
      refetchApproval();
    }
  }, [bootstrapSuccess, bootstrapData, refetchAdmin, refetchApproval]);

  // Show loading during initialization
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show sign-in screen
  if (!isAuthenticated) {
    return <SignInScreen />;
  }

  // Show loading during bootstrap on admin domain
  if (isAdminDomain && isBootstrapping) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Setting up admin access...</p>
        </div>
      </div>
    );
  }

  // Show error if bootstrap failed on admin domain
  if (isAdminDomain && bootstrapError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full">
          <QueryErrorState
            error={bootstrapErrorObj || new Error('Failed to bootstrap admin')}
            onRetry={() => {
              retryBootstrap();
              setBootstrapAttempted(false);
            }}
            title="Admin Setup Failed"
          />
        </div>
      </div>
    );
  }

  // Wait for actor and approval/admin checks to complete
  if (actorFetching || approvalLoading || adminLoading || !approvalFetched || !adminFetched) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Checking access permissions...</p>
        </div>
      </div>
    );
  }

  // Admins bypass the approval requirement
  if (isAdmin) {
    return <>{children}</>;
  }

  // If authenticated but not approved (and not admin), show approval required screen
  // This applies to both admin and staff domains
  if (!isApproved) {
    return <ApprovalRequiredScreen />;
  }

  // User is authenticated and approved, render the app
  return <>{children}</>;
}
