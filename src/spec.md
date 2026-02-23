# Specification

## Summary
**Goal:** Remove all authentication and access control logic to make the RENTIQ Udaipur application fully public and accessible without login.

**Planned changes:**
- Remove Internet Identity authentication components (SignInScreen, SignInRequiredDialog, useInternetIdentity)
- Remove AuthApprovalGate and ApprovalRequiredScreen components to allow direct access
- Remove admin role checks, staff restrictions, and approval status logic from all hooks and components
- Modify useActor hook to create backend actor without authentication requirements
- Remove authentication mixins, user approval system, and access control from backend/main.mo
- Remove UserProfile data type and all user management endpoints from backend
- Modify useMutationGate to allow all mutations without authentication checks
- Remove useBootstrapAdmin hook and admin bootstrapping logic

**User-visible outcome:** Users can access the RENTIQ Udaipur application immediately without any login or authentication, with full access to all features including inventory management, challans, payments, petty cash, and client management.
