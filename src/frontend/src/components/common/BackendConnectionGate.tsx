import type React from "react";

interface Props {
  children: React.ReactNode;
}

// Non-blocking gate: renders children immediately after authentication.
// Individual pages handle their own loading states when the actor is not yet ready.
// This prevents the "Connecting to backend..." black screen from blocking the entire app.
export default function BackendConnectionGate({ children }: Props) {
  return <>{children}</>;
}
