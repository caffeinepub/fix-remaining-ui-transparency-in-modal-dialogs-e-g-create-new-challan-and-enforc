import { useAppMode } from './useAppMode';
import { useIsCallerAdmin } from './useApprovalStatus';

/**
 * Hook that returns staff mode restrictions based on app mode and admin status.
 */
export function useStaffRestrictions() {
  const { isStaffMode } = useAppMode();
  const { data: isAdmin, isLoading } = useIsCallerAdmin();

  const canBulkUpload = !isStaffMode || (isAdmin ?? false);
  const canDelete = !isStaffMode || (isAdmin ?? false);

  return {
    canBulkUpload,
    canDelete,
    disabledReason: isStaffMode && !isAdmin ? 'Staff mode: Only admins can perform this action' : undefined,
    isLoading,
  };
}
