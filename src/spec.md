# Specification

## Summary
**Goal:** Remove the connection error UI that blocks access to the main application.

**Planned changes:**
- Remove the BackendConnectionGate component wrapper from App.tsx router configuration
- Delete the BackendConnectionGate.tsx component file from frontend/src/components/common/
- Preserve all other authentication and approval gate functionality

**User-visible outcome:** Users can immediately access the dashboard and all application modules without seeing connection error messages or diagnostics UI blocking the interface.
