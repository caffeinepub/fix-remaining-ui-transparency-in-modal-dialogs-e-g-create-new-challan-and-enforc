import { useQuery } from '@tanstack/react-query';

export const APPROVAL_QUERY_KEYS = {
  isCallerApproved: ['isCallerApproved'],
  isCallerAdmin: ['isCallerAdmin'],
};

/**
 * Hook that always returns approved status (no authentication required).
 */
export function useIsCallerApproved() {
  return useQuery<boolean>({
    queryKey: APPROVAL_QUERY_KEYS.isCallerApproved,
    queryFn: async () => true,
    enabled: true,
    retry: false,
    staleTime: Infinity,
  });
}

/**
 * Hook that always returns admin status (no authentication required).
 */
export function useIsCallerAdmin() {
  return useQuery<boolean>({
    queryKey: APPROVAL_QUERY_KEYS.isCallerAdmin,
    queryFn: async () => true,
    enabled: true,
    retry: false,
    staleTime: Infinity,
  });
}

/**
 * No-op mutation hook (approval system removed).
 */
export function useRequestApproval() {
  return {
    mutate: () => {},
    mutateAsync: async () => {},
    isPending: false,
    isSuccess: false,
    isError: false,
  };
}
