import { useMemo, useEffect } from 'react';

/**
 * Hook to detect if the app is running on the admin domain with enhanced diagnostic logging for domain-specific Internet Identity troubleshooting.
 */
export function useAppMode() {
  const isAdminDomain = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    // Admin domain contains "-x18" (e.g., rentiq-udaipur-x18.caffeine.xyz)
    return hostname.includes('-x18');
  }, []);

  const isStaffDomain = !isAdminDomain;

  useEffect(() => {
    console.log('=== App Mode Detection ===');
    console.log('Hostname:', window.location.hostname);
    console.log('Is Admin Domain:', isAdminDomain);
    console.log('Mode:', isAdminDomain ? 'admin' : 'staff');
  }, [isAdminDomain]);

  return {
    isAdminDomain,
    isStaffDomain,
    // Aliases for backward compatibility
    mode: isAdminDomain ? 'admin' : 'staff',
    isAdminMode: isAdminDomain,
    isStaffMode: isStaffDomain,
  };
}
