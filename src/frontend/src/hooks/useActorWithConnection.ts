import { useActor } from "./useActor";

export type ConnectionStatus = "idle" | "connecting" | "ready" | "failed";

export interface ConnectionDiagnostics {
  totalAttempts: number;
  failedAttempts: number;
  averageResponseTime: number;
  lastProbeAt: number | null;
}

export interface UseActorWithConnectionReturn {
  actor: ReturnType<typeof useActor>["actor"];
  connectionStatus: ConnectionStatus;
  isConnecting: boolean;
  isReady: boolean;
  isFailed: boolean;
  diagnostics: ConnectionDiagnostics;
  retryConnection: () => void;
  nextRetryIn: number;
}

// Hardcoded live data canister ID
export const CANISTER_ID =
  "fta74-uj2bo-de7nm-tugfh-6wwtx-4jqmx-2lmb6-ctii2-sbjei-urnag-dqe";

export function useActorWithConnection(): UseActorWithConnectionReturn {
  const { actor, isFetching } = useActor();

  const isReady = !!actor && !isFetching;

  const diagnostics: ConnectionDiagnostics = {
    totalAttempts: 1,
    failedAttempts: 0,
    averageResponseTime: 0,
    lastProbeAt: Date.now(),
  };

  return {
    actor,
    connectionStatus: isReady
      ? "ready"
      : isFetching
        ? "connecting"
        : actor
          ? "ready"
          : "connecting",
    isConnecting: !isReady,
    isReady,
    isFailed: false,
    diagnostics,
    retryConnection: () => {},
    nextRetryIn: 0,
  };
}
