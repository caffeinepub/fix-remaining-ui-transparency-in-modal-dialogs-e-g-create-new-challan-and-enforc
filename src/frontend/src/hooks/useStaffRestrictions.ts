/**
 * Hook that always allows all operations (no restrictions).
 */
export function useStaffRestrictions() {
  return {
    canBulkUpload: true,
    canDelete: true,
    disabledReason: undefined,
    isLoading: false,
  };
}
