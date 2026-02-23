import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';

export interface MutationGateState {
  canMutate: boolean;
  isReady: boolean;
  reason: string | null;
  message: string | null;
  isConnecting: boolean;
  isAuthenticated: boolean;
}

/**
 * Shared hook that gates mutations on actor readiness and authentication.
 */
export function useMutationGate(): MutationGateState {
  const { actor, isFetching } = useActor();
  const { identity, isInitializing } = useInternetIdentity();

  const isConnecting = isFetching || isInitializing;

  // Check authentication first
  if (!identity) {
    return {
      canMutate: false,
      isReady: false,
      reason: 'not-authenticated',
      message: 'You must sign in to perform this action',
      isConnecting: false,
      isAuthenticated: false,
    };
  }

  // Check actor availability
  if (!actor) {
    if (isConnecting) {
      const message = 'Connecting to backend...';
      return {
        canMutate: false,
        isReady: false,
        reason: message,
        message,
        isConnecting: true,
        isAuthenticated: true,
      };
    }

    const message = 'Backend not connected. Please check your connection and try again.';
    return {
      canMutate: false,
      isReady: false,
      reason: message,
      message,
      isConnecting: false,
      isAuthenticated: true,
    };
  }

  return {
    canMutate: true,
    isReady: true,
    reason: null,
    message: null,
    isConnecting: false,
    isAuthenticated: true,
  };
}
