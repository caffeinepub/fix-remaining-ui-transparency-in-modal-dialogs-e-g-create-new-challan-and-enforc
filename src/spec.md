# Specification

## Summary
**Goal:** Restore version 71 of RentIQ Udaipur with Internet Identity authentication, access controls, and admin bootstrapping, removing all changes made in versions 72-77.

**Planned changes:**
- Remove backend/migration.mo file entirely
- Restore Internet Identity authentication with principal-based access control in backend/main.mo
- Re-enable AuthApprovalGate, SignInScreen, ApprovalRequiredScreen, and SignInRequiredDialog components
- Restore useApprovalStatus, useBootstrapAdmin, and useStaffRestrictions hooks
- Restore AccessManagementPage for admin user management
- Re-enable authentication and approval checks in all mutation dialogs (ChallanFormDialog, ChallanEditDialog, InventoryFormDialog, PaymentFormDialog, PettyCashFormDialog, ClientBulkUploadDialog, etc.)
- Update backend canister ID from c05156bde8c3af0dd27a09a2167b2c6b3b00177 to c05l66bde8c3af0dd27a09a2167b2c6b3b001177
- Remove all features, functions, formulas, and UI changes added between version 71 and version 77

**User-visible outcome:** Users must authenticate with Internet Identity to access the application. The first user from the admin domain is automatically bootstrapped as admin. All other users must wait for admin approval before accessing the system. Admins can manage user access through the Access Management page and have full permissions, while staff users have restricted permissions for bulk operations and deletions. All data from version 77 is preserved.
