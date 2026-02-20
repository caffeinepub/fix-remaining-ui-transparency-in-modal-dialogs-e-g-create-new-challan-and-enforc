import { useState, useEffect, useCallback } from 'react';
import { useActor } from './useActor';
import { updateDiagnosticSessionContext, logActorInitEvent } from '../utils/runtimeDiagnostics';
import { useInternetIdentity } from './useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { createActorWithConfig } from '../config';

const PROBE_TIMEOUT = 8000; // 8 seconds for health check probe (increased from 5s)
const ACTOR_INIT_TIMEOUT = 20000; // 20 seconds for actor initialization (increased from 15s)
const MAX_RETRIES = 5; // Increased from 3
const INITIAL_BACKOFF_MS = 1000; // Start with 1 second
const MAX_BACKOFF_MS = 16000; // Cap at 16 seconds

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
  nextRetryIn: number;
  connectionDiagnostics: {
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    lastSuccessTimestamp: number | null;
    averageResponseTime: number | null;
  };
}

/**
 * Enhanced wrapper around useActor that adds:
 * - Fast connectivity probe using healthCheck query
 * - Exponential backoff retry mechanism
 * - Bounded-time initialization with progressive status
 * - In-app retry without page reload
 * - Comprehensive connection diagnostics
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
  const [nextRetryIn, setNextRetryIn] = useState(0);
  
  // Connection diagnostics
  const [diagnostics, setDiagnostics] = useState({
    totalAttempts: 0,
    successfulAttempts: 0,
    failedAttempts: 0,
    lastSuccessTimestamp: null as number | null,
    averageResponseTime: null as number | null,
    responseTimes: [] as number[],
  });

  // Calculate exponential backoff delay
  const getBackoffDelay = (attempt: number): number => {
    const delay = Math.min(INITIAL_BACKOFF_MS * Math.pow(2, attempt), MAX_BACKOFF_MS);
    return delay;
  };

  // Update elapsed time every second
  useEffect(() => {
    if (connectionState === 'probing' || connectionState === 'initializing') {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - initStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [connectionState, initStartTime]);

  // Countdown for next retry
  useEffect(() => {
    if (nextRetryIn > 0) {
      const interval = setInterval(() => {
        setNextRetryIn(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [nextRetryIn]);

  // Fast connectivity probe with enhanced diagnostics
  useEffect(() => {
    if (!probeComplete && connectionState === 'probing') {
      const runProbe = async () => {
        const probeStartTime = Date.now();
        
        try {
          setConnectionStage('Checking connectivity...');
          updateDiagnosticSessionContext({
            actorStatus: 'Probing',
            authStatus: identity ? 'Authenticated' : 'Anonymous'
          });
          logActorInitEvent('probe', `Starting connectivity probe (attempt ${retryCount + 1}/${MAX_RETRIES})`);

          // Update diagnostics
          setDiagnostics(prev => ({
            ...prev,
            totalAttempts: prev.totalAttempts + 1,
          }));

          // Create a lightweight anonymous actor just for the health check
          const probeActor = await createActorWithConfig();
          
          // Race between health check and timeout
          const probePromise = probeActor.healthCheck();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Probe timeout')), PROBE_TIMEOUT)
          );

          await Promise.race([probePromise, timeoutPromise]);
          
          // Probe succeeded - record metrics
          const responseTime = Date.now() - probeStartTime;
          logActorInitEvent('start', `Connectivity probe succeeded in ${responseTime}ms, initializing actor`);
          
          setDiagnostics(prev => {
            const newResponseTimes = [...prev.responseTimes, responseTime].slice(-10); // Keep last 10
            const avgResponseTime = newResponseTimes.reduce((a, b) => a + b, 0) / newResponseTimes.length;
            
            return {
              ...prev,
              successfulAttempts: prev.successfulAttempts + 1,
              lastSuccessTimestamp: Date.now(),
              responseTimes: newResponseTimes,
              averageResponseTime: avgResponseTime,
            };
          });
          
          setProbeComplete(true);
          setConnectionState('initializing');
          setConnectionStage('Initializing agent...');
          
        } catch (error) {
          // Probe failed - record failure and classify error
          const responseTime = Date.now() - probeStartTime;
          const errorMsg = error instanceof Error ? error.message : 'Connectivity probe failed';
          
          logActorInitEvent('failure', `Probe failed after ${responseTime}ms: ${errorMsg}`);
          
          setDiagnostics(prev => ({
            ...prev,
            failedAttempts: prev.failedAttempts + 1,
          }));
          
          // Classify the error for better user guidance
          let userMessage = 'Unable to reach backend. Please check your network connection.';
          
          if (errorMsg.includes('timeout') || errorMsg.includes('Probe timeout')) {
            userMessage = 'Connection timeout. The backend is not responding. This may be due to slow network or the canister initializing.';
          } else if (errorMsg.includes('fetch') || errorMsg.includes('network')) {
            userMessage = 'Network error. Please check your internet connection and firewall settings.';
          } else if (errorMsg.includes('refused') || errorMsg.includes('unreachable')) {
            userMessage = 'Backend canister is unreachable. The service may be temporarily unavailable.';
          }
          
          setConnectionState('error');
          setConnectionStage('Connection failed');
          setLastError(userMessage);
          updateDiagnosticSessionContext({ actorStatus: 'Probe Failed' });
          
          // Set up exponential backoff for next retry
          if (retryCount < MAX_RETRIES) {
            const backoffDelay = getBackoffDelay(retryCount);
            setNextRetryIn(Math.ceil(backoffDelay / 1000));
          }
        }
      };

      runProbe();
    }
  }, [probeComplete, connectionState, identity, forceRetryTrigger, retryCount]);

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
          setLastError('Actor initialization is taking longer than expected. The backend may be slow to respond or initializing.');
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

  // In-app retry with exponential backoff
  const retry = useCallback(async () => {
    if (retryCount >= MAX_RETRIES) {
      return;
    }

    const newRetryCount = retryCount + 1;
    const backoffDelay = getBackoffDelay(retryCount);
    
    logActorInitEvent('retry', `Scheduling retry attempt ${newRetryCount}/${MAX_RETRIES} with ${backoffDelay}ms backoff`);
    
    // Wait for backoff period
    setNextRetryIn(Math.ceil(backoffDelay / 1000));
    await new Promise(resolve => setTimeout(resolve, backoffDelay));
    
    setRetryCount(newRetryCount);
    setConnectionState('probing');
    setConnectionStage('Checking connectivity...');
    setLastError(null);
    setInitStartTime(Date.now());
    setElapsedTime(0);
    setProbeComplete(false);
    setNextRetryIn(0);
    
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
    elapsedTime,
    nextRetryIn,
    connectionDiagnostics: {
      totalAttempts: diagnostics.totalAttempts,
      successfulAttempts: diagnostics.successfulAttempts,
      failedAttempts: diagnostics.failedAttempts,
      lastSuccessTimestamp: diagnostics.lastSuccessTimestamp,
      averageResponseTime: diagnostics.averageResponseTime,
    },
  };
}
