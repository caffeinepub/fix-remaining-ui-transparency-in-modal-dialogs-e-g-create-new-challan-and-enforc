import { useActor } from './useActor';

export type ConnectionStatus = 'idle' | 'connecting' | 'ready' | 'failed';

export interface ConnectionDiagnostics {
  totalAttempts: number;
  failedAttempts: number;
  averageResponseTime: number;
  lastProbeAt: number | null;
}

export interface UseActorWithConnectionReturn {
  actor: ReturnType<typeof useActor>['actor'];
  connectionStatus: ConnectionStatus;
  isConnecting: boolean;
  isReady: boolean;
  isFailed: boolean;
  diagnostics: ConnectionDiagnostics;
  retryConnection: () => void;
  nextRetryIn: number;
}

const CANISTER_ID = 'ol3pc-lgw33-tzgc6-z7stc-melkr-xhrhp-vbxso-34vyu-3xlyv-qdexk-vqe';

export function useActorWithConnection(): UseActorWithConnectionReturn {
  const { actor, isFetching } = useActor();

  const isReady = !!actor && !isFetching;
  const connectionStatus: ConnectionStatus = isReady ? 'ready' : isFetching ? 'connecting' : actor ? 'ready' : 'connecting';

  const diagnostics: ConnectionDiagnostics = {
    totalAttempts: 1,
    failedAttempts: 0,
    averageResponseTime: 0,
    lastProbeAt: Date.now(),
  };

  return {
    actor,
    connectionStatus: isReady ? 'ready' : 'connecting',
    isConnecting: !isReady,
    isReady,
    isFailed: false,
    diagnostics,
    retryConnection: () => {},
    nextRetryIn: 0,
  };
}

export { CANISTER_ID };
