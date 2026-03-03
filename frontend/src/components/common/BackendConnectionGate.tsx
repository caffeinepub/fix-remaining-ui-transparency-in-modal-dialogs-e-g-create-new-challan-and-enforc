import React from 'react';
import { useActor } from '../../hooks/useActor';

interface Props {
  children: React.ReactNode;
}

export default function BackendConnectionGate({ children }: Props) {
  const { actor, isFetching } = useActor();

  if (isFetching && !actor) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--sidebar-bg)' }}>
        <div className="text-center">
          <div
            className="w-10 h-10 border-4 rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: 'var(--sidebar-active)', borderTopColor: 'transparent' }}
          />
          <p style={{ color: 'var(--sidebar-fg)' }} className="text-sm font-medium">Connecting to backend...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
