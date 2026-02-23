import { ReactNode } from 'react';

interface AuthApprovalGateProps {
  children: ReactNode;
}

/**
 * Pass-through component (authentication removed).
 */
export default function AuthApprovalGate({ children }: AuthApprovalGateProps) {
  return <>{children}</>;
}
