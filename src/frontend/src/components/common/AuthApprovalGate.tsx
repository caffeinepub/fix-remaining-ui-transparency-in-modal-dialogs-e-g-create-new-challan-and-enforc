import type React from "react";
import { useEffect, useState } from "react";
import { useAppMode } from "../../hooks/useAppMode";
import {
  useApprovalStatus,
  useIsCallerAdmin,
} from "../../hooks/useApprovalStatus";
import ApprovalRequiredScreen from "./ApprovalRequiredScreen";

interface Props {
  children: React.ReactNode;
}

export default function AuthApprovalGate({ children }: Props) {
  const { isAdminDomain } = useAppMode();
  const {
    isApproved,
    isLoading: approvalLoading,
    isFetched,
  } = useApprovalStatus();
  const { isAdmin, isLoading: adminLoading } = useIsCallerAdmin();

  // Timeout to prevent being stuck in "Checking access..." forever
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  // Admin domain: bypass approval entirely — always allow through
  if (isAdminDomain) {
    return <>{children}</>;
  }

  // User portal: check approval status
  const isStillLoading =
    (approvalLoading || adminLoading || !isFetched) && !timedOut;

  if (isStillLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--sidebar-bg)" }}
      >
        <div className="text-center space-y-3">
          <div
            className="w-10 h-10 border-4 rounded-full animate-spin mx-auto"
            style={{
              borderColor: "var(--sidebar-active)",
              borderTopColor: "transparent",
            }}
          />
          <p style={{ color: "var(--sidebar-muted)" }} className="text-sm">
            Checking access...
          </p>
        </div>
      </div>
    );
  }

  // After timeout or once loaded: if not approved and not admin, show approval screen
  if (!isApproved && !isAdmin) {
    return <ApprovalRequiredScreen />;
  }

  return <>{children}</>;
}
