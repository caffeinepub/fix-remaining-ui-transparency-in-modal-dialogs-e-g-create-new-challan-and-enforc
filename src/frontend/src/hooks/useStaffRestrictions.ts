import { useAppMode } from './useAppMode';
import { useIsCallerAdmin } from './useApprovalStatus';

/**
 * Hook that combines hostname-based mode + admin role to determine
 * if the current user can perform bulk upload and delete actions.
 */
export function useStaffRestrictions() {
  const { isStaffMode } = useAppMode();
  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();

  // In Staff/Company mode, only admins can bulk upload and delete
  // In Admin mode, all users can bulk upload and delete
  const canBulkUpload = !isStaffMode || (isAdmin === true);
  const canDelete = !isStaffMode || (isAdmin === true);

  const disabledReason = isStaffMode && !isAdmin
    ? 'This action is only available to administrators'
    : undefined;

  return {
    canBulkUpload,
    canDelete,
    disabledReason,
    isLoading: adminLoading,
  };
}
