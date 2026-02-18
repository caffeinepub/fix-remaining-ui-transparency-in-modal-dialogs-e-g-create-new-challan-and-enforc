import { useState, useEffect, useCallback } from 'react';
import { useActor } from './useActor';
import { updateDiagnosticSessionContext, logActorInitEvent } from '../utils/runtimeDiagnostics';
import { useInternetIdentity } from './useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { createActorWithConfig } from '../config';

const PROBE_TIMEOUT = 5000; // 5 seconds for health check probe
const ACTOR_INIT_TIMEOUT = 15000; // 15 seconds for actor initialization
const MAX_RETRIES = 3;

export type ActorConnectionState = 
  | 'probing' 
  | 'initializing' 
  | 'ready' 
  | 'error' 
  | 'timeout'
  | 'degraded';

export type ConnectionStage = 
  | 'Checking connectivity...'
  | 'Initializing agent...'
  | 'Creating actor...'
  | 'Verifying access...'
  | 'Ready'
  | 'Connection timeout'
  | 'Connection failed';

interface UseActorWithConnectionReturn {
  actor: ReturnType<typeof useActor>['actor'];
  isFetching: boolean;
  connectionState: ActorConnectionState;
  connectionStage: ConnectionStage;
  lastError: string | null;
  retry: () => Promise<void>;
  canRetry: boolean;
  retryCount: number;
  elapsedTime: number;
}

/**
 * Enhanced wrapper around useActor that adds:
 * - Fast connectivity probe using healthCheck query
 * - Bounded-time initialization with progressive status
 * - In-app retry without page reload
 * - Non-blocking degraded mode for slow connections
 */
export function useActorWithConnection(): UseActorWithConnectionReturn {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  
  const [connectionState, setConnectionState] = useState<ActorConnectionState>('probing');
  const [connectionStage, setConnectionStage] = useState<ConnectionStage>('Checking connectivity...');
  const [lastError, setLastError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [initStartTime, setInitStartTime] = useState<number>(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [probeComplete, setProbeComplete] = useState(false);
  const [forceRetryTrigger, setForceRetryTrigger] = useState(0);

  // Update elapsed time every second
  useEffect(() => {
    if (connectionState === 'probing' || connectionState === 'initializing') {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - initStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [connectionState, initStartTime]);

  // Fast connectivity probe
  useEffect(() => {
    if (!probeComplete && connectionState === 'probing') {
      const runProbe = async () => {
        try {
          setConnectionStage('Checking connectivity...');
          updateDiagnosticSessionContext({
            actorStatus: 'Probing',
            authStatus: identity ? 'Authenticated' : 'Anonymous'
          });
          logActorInitEvent('start', 'Starting connectivity probe');

          // Create a lightweight anonymous actor just for the health check
          const probeActor = await createActorWithConfig();
          
          // Race between health check and timeout
          const probePromise = probeActor.healthCheck();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Probe timeout')), PROBE_TIMEOUT)
          );

          await Promise.race([probePromise, timeoutPromise]);
          
          // Probe succeeded
          logActorInitEvent('start', 'Connectivity probe succeeded, initializing actor');
          setProbeComplete(true);
          setConnectionState('initializing');
          setConnectionStage('Initializing agent...');
          
        } catch (error) {
          // Probe failed
          const errorMsg = error instanceof Error ? error.message : 'Connectivity probe failed';
          logActorInitEvent('failure', `Probe failed: ${errorMsg}`);
          setConnectionState('error');
          setConnectionStage('Connection failed');
          setLastError('Unable to reach backend. Please check your network connection.');
          updateDiagnosticSessionContext({ actorStatus: 'Probe Failed' });
        }
      };

      runProbe();
    }
  }, [probeComplete, connectionState, identity, forceRetryTrigger]);

  // Track actor initialization after probe
  useEffect(() => {
    if (probeComplete && isFetching && !actor) {
      setConnectionState('initializing');
      setConnectionStage('Creating actor...');
      
      updateDiagnosticSessionContext({
        actorStatus: 'Initializing',
        authStatus: identity ? 'Authenticated' : 'Anonymous'
      });

      const timeoutId = setTimeout(() => {
        if (!actor && isFetching) {
          setConnectionState('timeout');
          setConnectionStage('Connection timeout');
          setLastError('Actor initialization is taking longer than expected. The backend may be slow to respond.');
          updateDiagnosticSessionContext({ actorStatus: 'Timeout' });
          logActorInitEvent('timeout', `Actor initialization timed out after ${ACTOR_INIT_TIMEOUT}ms`);
        }
      }, ACTOR_INIT_TIMEOUT);

      return () => clearTimeout(timeoutId);
    }
  }, [probeComplete, isFetching, actor, identity]);

  // Track successful initialization
  useEffect(() => {
    if (actor && !isFetching && probeComplete) {
      setConnectionState('ready');
      setConnectionStage('Ready');
      setLastError(null);
      updateDiagnosticSessionContext({ actorStatus: 'Ready' });
      logActorInitEvent('start', 'Actor initialization complete');
    }
  }, [actor, isFetching, probeComplete]);

  // In-app retry without page reload
  const retry = useCallback(async () => {
    if (retryCount >= MAX_RETRIES) {
      return;
    }

    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);
    setConnectionState('probing');
    setConnectionStage('Checking connectivity...');
    setLastError(null);
    setInitStartTime(Date.now());
    setElapsedTime(0);
    setProbeComplete(false);
    
    logActorInitEvent('retry', `Retry attempt ${newRetryCount}/${MAX_RETRIES}`);
    
    // Clear actor query cache to force re-initialization
    queryClient.removeQueries({ queryKey: ['actor'] });
    
    // Trigger probe re-run
    setForceRetryTrigger(prev => prev + 1);
  }, [retryCount, queryClient]);

  return {
    actor,
    isFetching,
    connectionState,
    connectionStage,
    lastError,
    retry,
    canRetry: retryCount < MAX_RETRIES,
    retryCount,
    elapsedTime
  };
}
