import { useMemo } from 'react';

/**
 * Hook to detect if the app is running on the admin domain.
 * Admin domain is identified by the presence of "-x18" in the hostname.
 */
export function useAppMode() {
  const isAdminDomain = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    // Admin domain contains "-x18" (e.g., rentiq-udaipur-x18.caffeine.xyz)
    return hostname.includes('-x18');
  }, []);

  const isStaffDomain = !isAdminDomain;

  return {
    isAdminDomain,
    isStaffDomain,
    // Aliases for backward compatibility
    mode: isAdminDomain ? 'admin' : 'staff',
    isAdminMode: isAdminDomain,
    isStaffMode: isStaffDomain,
  };
}
