import { ReactNode } from 'react';
import { useActorWithConnection } from '../../hooks/useActorWithConnection';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Loader2, Clock } from 'lucide-react';

interface BackendConnectionGateProps {
  children: ReactNode;
}

/**
 * Global gate component with fast connectivity probe and bounded-time initialization.
 * Shows progressive status messages and allows in-app retry without page reload.
 */
export default function BackendConnectionGate({ children }: BackendConnectionGateProps) {
  const { 
    actor, 
    connectionState, 
    connectionStage,
    lastError, 
    retry, 
    canRetry,
    retryCount,
    elapsedTime
  } = useActorWithConnection();

  // Show loading state during probe and initialization
  if ((connectionState === 'probing' || connectionState === 'initializing') && !actor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 max-w-md">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <div className="space-y-2">
            <p className="text-lg font-medium">{connectionStage}</p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{elapsedTime}s elapsed</span>
            </div>
            {retryCount > 0 && (
              <p className="text-sm text-muted-foreground">
                Retry attempt {retryCount}/{3}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show error state with retry option
  if ((connectionState === 'error' || connectionState === 'timeout') && !actor) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {connectionState === 'timeout' ? 'Connection Timeout' : 'Connection Failed'}
          </AlertTitle>
          <AlertDescription className="space-y-4">
            <div className="space-y-2">
              <p>
                {connectionState === 'timeout'
                  ? 'The backend is taking longer than expected to respond. This may be due to:'
                  : 'Unable to connect to the backend. This may be due to:'}
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                <li>Slow network connection</li>
                <li>Backend canister is initializing</li>
                <li>Browser compatibility issues (try a modern browser)</li>
                <li>Network firewall or proxy blocking the connection</li>
              </ul>
            </div>
            
            {lastError && (
              <div className="text-sm font-mono bg-destructive p-3 rounded border border-destructive">
                {lastError}
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Waited {elapsedTime} seconds</span>
              {retryCount > 0 && <span>• Attempt {retryCount}/{3}</span>}
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={retry} 
                disabled={!canRetry} 
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {canRetry ? 'Retry Connection' : 'Max Retries Reached'}
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="secondary"
                className="flex-1"
              >
                Reload Page
              </Button>
            </div>
            
            {!canRetry && (
              <p className="text-sm text-muted-foreground">
                If the problem persists, please try again later or contact support.
              </p>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Backend is ready, render children
  return <>{children}</>;
}
