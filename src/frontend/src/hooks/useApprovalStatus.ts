import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';

// Export query keys for external invalidation
export const APPROVAL_QUERY_KEYS = {
  isCallerApproved: ['isCallerApproved'],
  isCallerAdmin: ['isCallerAdmin'],
};

/**
 * Hook to check if the current caller is approved to access the application.
 * Refetches periodically and on window focus so users see access granted automatically.
 */
export function useIsCallerApproved() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: APPROVAL_QUERY_KEYS.isCallerApproved,
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerApproved();
    },
    enabled: !!actor && !isFetching,
    retry: false,
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });
}

/**
 * Hook to check if the current caller is an admin.
 */
export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: APPROVAL_QUERY_KEYS.isCallerAdmin,
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

/**
 * Mutation hook to request approval for the current caller.
 */
export function useRequestApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.requestApproval();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPROVAL_QUERY_KEYS.isCallerApproved });
    },
  });
}
