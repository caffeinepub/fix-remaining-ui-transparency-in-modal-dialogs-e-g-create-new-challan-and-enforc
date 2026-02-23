import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { updateDiagnosticSessionContext, logActorInitEvent } from '../utils/runtimeDiagnostics';
import { createActorWithConfig } from '../config';

const PROBE_TIMEOUT = 8000;
const ACTOR_INIT_TIMEOUT = 20000;
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 16000;

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
  actor: any;
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
 * Enhanced wrapper that creates anonymous actor without authentication.
 * Includes connectivity probe, exponential backoff retry, and connection diagnostics.
 */
export function useActorWithConnection(): UseActorWithConnectionReturn {
  const queryClient = useQueryClient();
  
  const [actor, setActor] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [connectionState, setConnectionState] = useState<ActorConnectionState>('probing');
  const [connectionStage, setConnectionStage] = useState<ConnectionStage>('Checking connectivity...');
  const [lastError, setLastError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [initStartTime, setInitStartTime] = useState<number>(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [probeComplete, setProbeComplete] = useState(false);
  const [forceRetryTrigger, setForceRetryTrigger] = useState(0);
  const [nextRetryIn, setNextRetryIn] = useState(0);
  
  const [diagnostics, setDiagnostics] = useState({
    totalAttempts: 0,
    successfulAttempts: 0,
    failedAttempts: 0,
    lastSuccessTimestamp: null as number | null,
    averageResponseTime: null as number | null,
    responseTimes: [] as number[],
  });

  const getBackoffDelay = (attempt: number): number => {
    const delay = Math.min(INITIAL_BACKOFF_MS * Math.pow(2, attempt), MAX_BACKOFF_MS);
    return delay;
  };

  useEffect(() => {
    if (connectionState === 'probing' || connectionState === 'initializing') {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - initStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [connectionState, initStartTime]);

  useEffect(() => {
    if (nextRetryIn > 0) {
      const interval = setInterval(() => {
        setNextRetryIn(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [nextRetryIn]);

  useEffect(() => {
    if (!probeComplete && connectionState === 'probing') {
      const runProbe = async () => {
        const probeStartTime = Date.now();
        
        try {
          setConnectionStage('Checking connectivity...');
          updateDiagnosticSessionContext({
            actorStatus: 'Probing',
            authStatus: 'Anonymous'
          });
          logActorInitEvent('probe', `Starting connectivity probe (attempt ${retryCount + 1}/${MAX_RETRIES})`);

          setDiagnostics(prev => ({
            ...prev,
            totalAttempts: prev.totalAttempts + 1,
          }));

          const probeActor = await createActorWithConfig();
          
          const probePromise = probeActor.healthCheck();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Probe timeout')), PROBE_TIMEOUT)
          );

          await Promise.race([probePromise, timeoutPromise]);
          
          const responseTime = Date.now() - probeStartTime;
          logActorInitEvent('start', `Connectivity probe succeeded in ${responseTime}ms, initializing actor`);
          
          setDiagnostics(prev => {
            const newResponseTimes = [...prev.responseTimes, responseTime].slice(-10);
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
          const responseTime = Date.now() - probeStartTime;
          const errorMsg = error instanceof Error ? error.message : 'Connectivity probe failed';
          
          logActorInitEvent('failure', `Probe failed after ${responseTime}ms: ${errorMsg}`);
          
          setDiagnostics(prev => ({
            ...prev,
            failedAttempts: prev.failedAttempts + 1,
          }));
          
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
          
          if (retryCount < MAX_RETRIES) {
            const backoffDelay = getBackoffDelay(retryCount);
            setNextRetryIn(Math.ceil(backoffDelay / 1000));
          }
        }
      };

      runProbe();
    }
  }, [probeComplete, connectionState, forceRetryTrigger, retryCount]);

  useEffect(() => {
    if (probeComplete && !actor) {
      const initActor = async () => {
        setIsFetching(true);
        setConnectionState('initializing');
        setConnectionStage('Creating actor...');
        
        updateDiagnosticSessionContext({
          actorStatus: 'Initializing',
          authStatus: 'Anonymous'
        });

        const timeoutId = setTimeout(() => {
          if (!actor) {
            setConnectionState('timeout');
            setConnectionStage('Connection timeout');
            setLastError('Actor initialization is taking longer than expected. The backend may be slow to respond or initializing.');
            updateDiagnosticSessionContext({ actorStatus: 'Timeout' });
            logActorInitEvent('timeout', `Actor initialization timed out after ${ACTOR_INIT_TIMEOUT}ms`);
          }
        }, ACTOR_INIT_TIMEOUT);

        try {
          const newActor = await createActorWithConfig();
          setActor(newActor);
          setConnectionState('ready');
          setConnectionStage('Ready');
          setLastError(null);
          setIsFetching(false);
          updateDiagnosticSessionContext({ actorStatus: 'Ready' });
          logActorInitEvent('start', 'Actor initialization complete');
        } catch (error) {
          setConnectionState('error');
          setConnectionStage('Connection failed');
          setLastError(error instanceof Error ? error.message : 'Failed to initialize actor');
          setIsFetching(false);
        } finally {
          clearTimeout(timeoutId);
        }
      };

      initActor();
    }
  }, [probeComplete, actor]);

  const retry = useCallback(async () => {
    if (retryCount >= MAX_RETRIES) {
      return;
    }

    const newRetryCount = retryCount + 1;
    const backoffDelay = getBackoffDelay(retryCount);
    
    logActorInitEvent('retry', `Scheduling retry attempt ${newRetryCount}/${MAX_RETRIES} with ${backoffDelay}ms backoff`);
    
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
    setActor(null);
    setIsFetching(true);
    
    queryClient.removeQueries({ queryKey: ['actor'] });
    
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
