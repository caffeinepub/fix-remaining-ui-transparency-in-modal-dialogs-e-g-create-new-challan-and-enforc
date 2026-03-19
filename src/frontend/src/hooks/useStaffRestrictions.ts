import { useAppMode } from "./useAppMode";
import { useIsCallerAdmin } from "./useApprovalStatus";

/**
 * Returns restriction flags based on app mode and admin status.
 * staffRestricted = true means the user cannot bulk upload or delete.
 */
export function useStaffRestrictions() {
  const { isAdminDomain } = useAppMode();
  const { isAdmin } = useIsCallerAdmin();

  // Staff restrictions apply when NOT on admin domain AND NOT an admin
  const staffRestricted = !isAdminDomain && !isAdmin;

  return {
    staffRestricted,
    canDelete: !staffRestricted,
    canBulkUpload: !staffRestricted,
    disabledReason: staffRestricted
      ? "Staff mode: Only admins can perform this action"
      : undefined,
  };
}
