import { useActorWithConnection } from './useActorWithConnection';
import { useInternetIdentity } from './useInternetIdentity';

export interface MutationGateState {
  canMutate: boolean;
  isReady: boolean; // Alias for canMutate for backward compatibility
  reason: string | null;
  message: string | null; // Alias for reason for backward compatibility
  isConnecting: boolean;
  isAuthenticated: boolean;
}

/**
 * Shared hook that gates mutations on actor readiness and authentication state,
 * with enhanced connection stage awareness for better user messaging
 */
export function useMutationGate(): MutationGateState {
  const { actor, connectionState, connectionStage } = useActorWithConnection();
  const { identity } = useInternetIdentity();

  const isAuthenticated = !!identity;
  const isConnecting = connectionState === 'probing' || connectionState === 'initializing';

  // If backend is not connected
  if (!actor) {
    if (isConnecting) {
      const message = `Connecting to backend... (${connectionStage})`;
      return {
        canMutate: false,
        isReady: false,
        reason: message,
        message,
        isConnecting: true,
        isAuthenticated,
      };
    }
    
    if (connectionState === 'timeout') {
      const message = 'Backend connection timed out. Please retry the connection.';
      return {
        canMutate: false,
        isReady: false,
        reason: message,
        message,
        isConnecting: false,
        isAuthenticated,
      };
    }

    const message = 'Backend not connected. Please check your connection and try again.';
    return {
      canMutate: false,
      isReady: false,
      reason: message,
      message,
      isConnecting: false,
      isAuthenticated,
    };
  }

  // If not authenticated
  if (!isAuthenticated) {
    const message = 'You need to sign in to perform this action.';
    return {
      canMutate: false,
      isReady: false,
      reason: message,
      message,
      isConnecting: false,
      isAuthenticated: false,
    };
  }

  // All checks passed
  return {
    canMutate: true,
    isReady: true,
    reason: null,
    message: null,
    isConnecting: false,
    isAuthenticated: true,
  };
}
