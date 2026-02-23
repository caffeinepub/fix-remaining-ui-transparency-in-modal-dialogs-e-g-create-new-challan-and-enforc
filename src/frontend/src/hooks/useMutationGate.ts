import { useActorWithConnection } from './useActorWithConnection';

export interface MutationGateState {
  canMutate: boolean;
  isReady: boolean;
  reason: string | null;
  message: string | null;
  isConnecting: boolean;
  isAuthenticated: boolean;
}

/**
 * Shared hook that gates mutations on actor readiness only (no authentication required).
 */
export function useMutationGate(): MutationGateState {
  const { actor, connectionState, connectionStage } = useActorWithConnection();

  const isConnecting = connectionState === 'probing' || connectionState === 'initializing';

  if (!actor) {
    if (isConnecting) {
      const message = `Connecting to backend... (${connectionStage})`;
      return {
        canMutate: false,
        isReady: false,
        reason: message,
        message,
        isConnecting: true,
        isAuthenticated: true,
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
