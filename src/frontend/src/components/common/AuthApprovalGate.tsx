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
 * Global authentication and approval gate with enhanced Internet Identity initialization diagnostics, domain-aware bootstrap flow, and comprehensive error handling for authentication failures.
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

  // Log authentication state changes for diagnostics
  useEffect(() => {
    console.log('=== AuthApprovalGate State ===');
    console.log('Login Status:', loginStatus);
    console.log('Is Authenticated:', isAuthenticated);
    console.log('Is Admin Domain:', isAdminDomain);
    console.log('Actor Ready:', !!actor && !actorFetching);
    console.log('Bootstrap Attempted:', bootstrapAttempted);
    console.log('Is Bootstrapping:', isBootstrapping);
    console.log('Bootstrap Success:', bootstrapSuccess);
  }, [loginStatus, isAuthenticated, isAdminDomain, actor, actorFetching, bootstrapAttempted, isBootstrapping, bootstrapSuccess]);

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
      console.log('=== Attempting Bootstrap Admin ===');
      console.log('Domain:', window.location.hostname);
      console.log('Principal:', identity?.getPrincipal().toString());
      
      setBootstrapAttempted(true);
      bootstrapAdmin(true);
    }
  }, [isAdminDomain, isAuthenticated, actor, actorFetching, bootstrapAttempted, isBootstrapping, bootstrapSuccess, bootstrapAdmin, identity]);

  // Refetch admin/approval status after successful bootstrap
  useEffect(() => {
    if (bootstrapSuccess && bootstrapData?.success) {
      console.log('=== Bootstrap Successful - Refetching Permissions ===');
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
          <p className="text-sm text-muted-foreground">Initializing authentication...</p>
          <p className="text-xs text-muted-foreground">
            Domain: {typeof window !== 'undefined' ? window.location.hostname : 'unknown'}
          </p>
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
          <p className="text-xs text-muted-foreground">
            Principal: {identity?.getPrincipal().toString().substring(0, 20)}...
          </p>
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
              console.log('=== Retrying Bootstrap Admin ===');
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
    console.log('=== User is Admin - Granting Access ===');
    return <>{children}</>;
  }

  // If authenticated but not approved (and not admin), show approval required screen
  // This applies to both admin and staff domains
  if (!isApproved) {
    console.log('=== User Not Approved - Showing Approval Screen ===');
    return <ApprovalRequiredScreen />;
  }

  // User is authenticated and approved, render the app
  console.log('=== User Authenticated and Approved - Rendering App ===');
  return <>{children}</>;
}
