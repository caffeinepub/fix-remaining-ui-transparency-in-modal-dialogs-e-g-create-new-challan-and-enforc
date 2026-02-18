import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserApprovalInfo, ApprovalStatus } from '../backend';
import { Principal } from '@dfinity/principal';

/**
 * Hook to check if the current caller is an admin (for access management UI).
 */
export function useIsAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

/**
 * Hook to list all user approvals (admin only).
 */
export function useListApprovals() {
  const { actor, isFetching } = useActor();

  return useQuery<UserApprovalInfo[]>({
    queryKey: ['approvals'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listApprovals();
    },
    enabled: !!actor && !isFetching,
  });
}

/**
 * Mutation hook to set approval status for a user (admin only).
 */
export function useSetApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, status }: { user: Principal; status: ApprovalStatus }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setApproval(user, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}

/**
 * Helper to derive pending and approved users from the full approval list.
 */
export function useDerivedApprovalLists() {
  const { data: approvals = [], isLoading, refetch } = useListApprovals();

  const pending = approvals.filter((a) => a.status === 'pending');
  const approved = approvals.filter((a) => a.status === 'approved');

  return { pending, approved, isLoading, refetch };
}
