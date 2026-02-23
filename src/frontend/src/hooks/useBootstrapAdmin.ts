import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { APPROVAL_QUERY_KEYS } from './useApprovalStatus';

/**
 * Mutation hook to bootstrap current user as admin.
 */
export function useBootstrapAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      // The backend's initialize method is called automatically in useActor.ts
      // This hook is for manual retry if needed
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPROVAL_QUERY_KEYS.isCallerApproved });
      queryClient.invalidateQueries({ queryKey: APPROVAL_QUERY_KEYS.isCallerAdmin });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });

  return {
    bootstrapAdmin: mutation.mutate,
    isBootstrapping: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
    retry: mutation.reset,
  };
}
