import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { BecomeAdminResponse } from '../backend';

/**
 * Hook to bootstrap the first admin user on the admin domain.
 * This should only be called once when the admin domain is accessed for the first time.
 */
export function useBootstrapAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  const mutation = useMutation<BecomeAdminResponse, Error, boolean>({
    mutationFn: async (isAdminDomain: boolean) => {
      if (!actor) throw new Error('Actor not available');
      return actor.becomeBootstrapAdmin(isAdminDomain);
    },
    onSuccess: (response) => {
      if (response.success) {
        // Invalidate admin and approval queries to refresh the gate
        queryClient.invalidateQueries({ queryKey: ['isCallerAdmin'] });
        queryClient.invalidateQueries({ queryKey: ['isCallerApproved'] });
      }
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
