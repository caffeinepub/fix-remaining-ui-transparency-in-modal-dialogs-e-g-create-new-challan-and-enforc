import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserApprovalInfo } from "../backend";
import { ApprovalStatus } from "../backend";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export function useIsAdmin() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await actor.isCallerAdmin();
      } catch {
        return false;
      }
    },
    enabled: !!actor && !actorFetching && !!identity,
    retry: 2,
  });
}

export function useListApprovals() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<UserApprovalInfo[]>({
    queryKey: ["listApprovals"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listApprovals();
    },
    enabled: !!actor && !actorFetching && !!identity,
    refetchInterval: 10000,
    retry: 2,
  });
}

export function useSetApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      user,
      status,
    }: { user: Principal; status: ApprovalStatus }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.setApproval(user, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listApprovals"] });
      queryClient.invalidateQueries({ queryKey: ["approvalStatus"] });
    },
  });
}

export function useAccessManagement() {
  const listQuery = useListApprovals();

  const pendingUsers = (listQuery.data ?? []).filter(
    (u) => u.status === ApprovalStatus.pending,
  );
  const approvedUsers = (listQuery.data ?? []).filter(
    (u) => u.status === ApprovalStatus.approved,
  );
  const rejectedUsers = (listQuery.data ?? []).filter(
    (u) => u.status === ApprovalStatus.rejected,
  );

  return {
    ...listQuery,
    pendingUsers,
    approvedUsers,
    rejectedUsers,
  };
}
