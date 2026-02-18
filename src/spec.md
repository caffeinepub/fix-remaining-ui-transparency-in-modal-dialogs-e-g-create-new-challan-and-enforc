# Specification

## Summary
**Goal:** Ensure the admin-hosted app link can permanently bootstrap the first Internet Identity user as an admin so they never see the “Approval Required” screen on the admin hostname.

**Planned changes:**
- Backend: Add a persistent one-time “bootstrap admin” grant that assigns admin to the caller only when there are currently zero admins stored, and persists that admin principal for future sessions.
- Backend: Add a shared (state-changing) API method to perform the bootstrap flow and ensure admin checks bypass approval gating for admins.
- Frontend: On the admin hostname (rentiq-udaipur-x18.caffeine.xyz), after sign-in call the bootstrap method when needed, then re-check admin status and proceed into the app without showing ApprovalRequiredScreen for the bootstrapped admin.
- Frontend: If bootstrap fails, show a clear error or retry option (avoid indefinite loading).

**User-visible outcome:** When signing in via the admin link for the first time (with no existing admins), the user is automatically and permanently made admin and can access the app without the “Approval Required” screen; the staff/company link behavior remains unchanged for non-admin users.
