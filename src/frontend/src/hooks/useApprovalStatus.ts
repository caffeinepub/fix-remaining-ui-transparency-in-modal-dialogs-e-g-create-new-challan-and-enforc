import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';

export const APPROVAL_QUERY_KEYS = {
  isCallerApproved: ['isCallerApproved'],
  isCallerAdmin: ['isCallerAdmin'],
};

/**
 * Hook to check if current user is approved.
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
    refetchInterval: 5000, // Refetch every 5 seconds for pending users
  });
}

/**
 * Hook to check if current user is admin.
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
 * Mutation hook to request approval.
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
