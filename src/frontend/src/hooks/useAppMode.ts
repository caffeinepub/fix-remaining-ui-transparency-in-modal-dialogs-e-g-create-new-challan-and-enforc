import { useMemo } from "react";

export function useAppMode() {
  const isAdminDomain = useMemo(() => {
    const hostname = window.location.hostname;
    const isAdmin =
      hostname.includes("-x18") ||
      hostname === "localhost" ||
      hostname === "127.0.0.1";
    console.log("[AppMode] hostname:", hostname, "| isAdminDomain:", isAdmin);
    return isAdmin;
  }, []);

  return { isAdminDomain };
}
