import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';

/**
 * Hook to bootstrap the current user as admin.
 * The actual bootstrap happens in useActor.ts via _initializeAccessControlWithSecret.
 * This hook provides a way to invalidate approval-related queries after bootstrap.
 */
export function useBootstrapAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      // The backend auto-bootstraps the first admin via _initializeAccessControlWithSecret
      // called in useActor.ts. We just need to refresh the approval/admin status.
      return actor.isCallerAdmin();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isCallerApproved'] });
      queryClient.invalidateQueries({ queryKey: ['isCallerAdmin'] });
      queryClient.invalidateQueries({ queryKey: ['listApprovals'] });
    },
    onError: (error) => {
      console.warn('[useBootstrapAdmin] Bootstrap check failed:', error);
    },
  });

  return mutation;
}
