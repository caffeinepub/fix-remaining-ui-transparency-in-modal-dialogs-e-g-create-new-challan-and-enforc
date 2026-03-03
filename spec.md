# Specification

## Summary
**Goal:** Fix the app initialization flow so the Internet Identity login screen appears immediately on load, and the backend actor is only initialized after successful authentication — eliminating the black screen / "Connecting to backend..." spinner for unauthenticated users.

**Planned changes:**
- Show `SignInScreen` immediately on app load for unauthenticated users, with no loading spinner or black screen
- Gate `BackendConnectionGate` so it only renders after the user is authenticated via Internet Identity
- Initialize the backend actor only after successful Internet Identity login
- Preserve the existing Build Info panel (ⓘ icon) showing Backend Actor status, Authentication status, Build Time, Commit Hash, and Quick Actions
- Preserve all 7 sidebar modules (Dashboard, Inventory, Challans, Payments, Petty Cash, Client Balances, Reports) and RENTIQ branding without any functional changes

**User-visible outcome:** On app load, users immediately see the Internet Identity login panel. After authenticating, the backend connects and all 7 modules become accessible. The ⓘ Build Info panel shows "Backend Actor: Ready" and "Authentication: Authenticated" post-login.
