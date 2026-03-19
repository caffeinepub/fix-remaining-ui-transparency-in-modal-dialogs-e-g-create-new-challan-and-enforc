import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export interface MutationGateResult {
  isReady: boolean;
  isAuthenticated: boolean;
  isConnecting: boolean;
  reason: "not-authenticated" | "actor-unavailable" | "ready";
  message: string;
}

export function useMutationGate(): MutationGateResult {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  const isAuthenticated = !!identity;
  const isConnecting = isFetching && !actor;

  // If actor is available, we're ready regardless of connection state
  if (actor) {
    return {
      isReady: true,
      isAuthenticated,
      isConnecting: false,
      reason: "ready",
      message: "",
    };
  }

  // Actor not yet available but still fetching - allow after brief wait
  if (isConnecting) {
    return {
      isReady: false,
      isAuthenticated,
      isConnecting: true,
      reason: "actor-unavailable",
      message: "Backend is connecting. Please wait a moment and try again.",
    };
  }

  // Actor unavailable and not fetching - still allow (fail gracefully at mutation time)
  return {
    isReady: true,
    isAuthenticated,
    isConnecting: false,
    reason: "ready",
    message: "",
  };
}
