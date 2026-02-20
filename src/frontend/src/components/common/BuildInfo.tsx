import { useQuery } from '@tanstack/react-query';
import { useActorWithConnection } from '../../hooks/useActorWithConnection';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useNavigate } from '@tanstack/react-router';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Info, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Package, 
  Clock,
  ExternalLink,
  FileText,
  Shield,
  TestTube,
  Activity,
  TrendingUp,
  Zap
} from 'lucide-react';
import { getDiagnosticLog, logAuthEvent } from '../../utils/runtimeDiagnostics';
import DiagnosticsReportDialog from './DiagnosticsReportDialog';
import { useState } from 'react';

/**
 * Build Info panel with enhanced backend connection diagnostics, real-time health monitoring, manual connection tests, and comprehensive troubleshooting guidance.
 */
export default function BuildInfo() {
  const navigate = useNavigate();
  const { 
    actor, 
    connectionState, 
    connectionStage,
    lastError, 
    retry, 
    canRetry,
    retryCount,
    elapsedTime,
    nextRetryIn,
    connectionDiagnostics,
  } = useActorWithConnection();
  const { login, loginStatus, identity } = useInternetIdentity();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [testingAuth, setTestingAuth] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  const buildMetadataQuery = useQuery({
    queryKey: ['buildMetadata'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getBuildMetadata();
    },
    enabled: !!actor && connectionState === 'ready',
    retry: false,
  });

  const diagnosticLog = getDiagnosticLog();
  const hasErrors = diagnosticLog.length > 0;
  const authErrors = diagnosticLog.filter(e => 
    e.type === 'auth-blank-screen' || 
    e.type === 'auth-popup-blocked' || 
    e.type === 'auth-timeout'
  );
  const connectionErrors = diagnosticLog.filter(e =>
    e.type === 'connection-failure' ||
    e.type === 'actor-timeout' ||
    e.type === 'actor-failure'
  );

  const handleRetry = async () => {
    await retry();
  };

  const handleTestConnection = async () => {
    if (!actor) return;
    
    setTestingConnection(true);
    const startTime = Date.now();
    
    try {
      console.log('=== Manual Connection Test ===');
      console.log('Testing backend health check...');
      console.log('Timestamp:', new Date().toISOString());
      
      await actor.healthCheck();
      
      const responseTime = Date.now() - startTime;
      console.log('✓ Connection test successful');
      console.log('Response time:', responseTime, 'ms');
    } catch (error: any) {
      console.error('=== Manual Connection Test Failed ===');
      console.error('Error:', error);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTestAuth = async () => {
    setTestingAuth(true);
    logAuthEvent('init', 'Manual authentication test initiated from Build Info');
    
    try {
      console.log('=== Manual Internet Identity Test ===');
      console.log('Current Status:', loginStatus);
      console.log('Is Authenticated:', !!identity);
      console.log('Domain:', window.location.hostname);
      console.log('Timestamp:', new Date().toISOString());
      
      await login();
      
      console.log('Manual test: Login successful');
    } catch (error: any) {
      console.error('=== Manual Internet Identity Test Failed ===');
      console.error('Error:', error);
      
      if (error?.message?.includes('popup') || error?.message?.includes('blocked')) {
        logAuthEvent('popup-blocked', 'Popup blocker detected during manual test');
      } else if (error?.message?.includes('timeout')) {
        logAuthEvent('timeout', 'Authentication timeout during manual test');
      } else {
        logAuthEvent('blank-screen', `Manual test failed: ${error?.message}`);
      }
    } finally {
      setTestingAuth(false);
    }
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" title="Build Info">
            <Info className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Build & Runtime Info</SheetTitle>
            <SheetDescription>
              System diagnostics and deployment verification
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
            <div className="space-y-6 py-4">
              {/* Connection Status */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Backend Connection
                </h3>
                
                {connectionState === 'ready' ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle>Connected</AlertTitle>
                    <AlertDescription className="space-y-2">
                      <p>Backend is ready and responding normally.</p>
                      
                      {/* Connection Metrics */}
                      {connectionDiagnostics.totalAttempts > 0 && (
                        <div className="text-xs space-y-1 p-2 bg-muted rounded">
                          <div className="font-semibold">Connection Metrics:</div>
                          <div className="flex items-center gap-2">
                            <Activity className="h-3 w-3" />
                            <span>
                              {connectionDiagnostics.successfulAttempts} successful / {connectionDiagnostics.totalAttempts} total
                            </span>
                          </div>
                          {connectionDiagnostics.averageResponseTime && (
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-3 w-3" />
                              <span>Avg response: {Math.round(connectionDiagnostics.averageResponseTime)}ms</span>
                            </div>
                          )}
                          {connectionDiagnostics.lastSuccessTimestamp && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>
                                Last success: {new Date(connectionDiagnostics.lastSuccessTimestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <Button
                        onClick={handleTestConnection}
                        disabled={testingConnection}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        {testingConnection ? 'Testing...' : 'Test Connection Now'}
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>
                      {connectionState === 'timeout' ? 'Connection Timeout' : 
                       connectionState === 'error' ? 'Connection Failed' :
                       'Connecting...'}
                    </AlertTitle>
                    <AlertDescription className="space-y-3">
                      <div className="space-y-2">
                        <p className="font-medium">{connectionStage}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4" />
                          <span>{elapsedTime}s elapsed</span>
                          {retryCount > 0 && <span>• Attempt {retryCount}/5</span>}
                        </div>
                        {nextRetryIn > 0 && (
                          <div className="text-sm text-muted-foreground">
                            Next retry in {nextRetryIn}s...
                          </div>
                        )}
                      </div>
                      {lastError && (
                        <p className="text-sm font-mono bg-destructive/10 p-2 rounded">
                          {lastError}
                        </p>
                      )}
                      
                      {/* Connection Diagnostics */}
                      {connectionDiagnostics.totalAttempts > 0 && (
                        <div className="text-xs space-y-1 p-2 bg-muted/50 rounded">
                          <div className="font-semibold">Connection Diagnostics:</div>
                          <div>Total attempts: {connectionDiagnostics.totalAttempts}</div>
                          <div>Successful: {connectionDiagnostics.successfulAttempts}</div>
                          <div>Failed: {connectionDiagnostics.failedAttempts}</div>
                        </div>
                      )}
                      
                      <Button 
                        onClick={handleRetry} 
                        disabled={!canRetry || nextRetryIn > 0}
                        variant="outline" 
                        size="sm"
                        className="w-full"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {nextRetryIn > 0 
                          ? `Retrying in ${nextRetryIn}s...`
                          : canRetry 
                            ? 'Retry Connection' 
                            : 'Max Retries Reached'}
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                
                {connectionErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Connection Issues Detected</AlertTitle>
                    <AlertDescription className="text-xs space-y-1">
                      <p>{connectionErrors.length} connection error(s) logged</p>
                      <p>Check diagnostics for details</p>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Separator />

              {/* Internet Identity Status */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Internet Identity Status
                </h3>
                
                {identity ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle>Authenticated</AlertTitle>
                    <AlertDescription className="space-y-2">
                      <p className="text-xs font-mono break-all">
                        {identity.getPrincipal().toString()}
                      </p>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Not Authenticated</AlertTitle>
                    <AlertDescription>
                      Sign in to access the application.
                    </AlertDescription>
                  </Alert>
                )}

                {authErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Authentication Issues Detected</AlertTitle>
                    <AlertDescription className="text-xs space-y-1">
                      <p>{authErrors.length} authentication error(s) logged</p>
                      <p>Check diagnostics for details</p>
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleTestAuth}
                  disabled={testingAuth || loginStatus === 'logging-in'}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {testingAuth ? 'Testing...' : 'Test Internet Identity Login'}
                </Button>
              </div>

              <Separator />

              {/* Build Metadata */}
              {buildMetadataQuery.data && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Build Metadata
                  </h3>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Build Time:</span>
                      <span className="font-mono">
                        {new Date(Number(buildMetadataQuery.data.buildTime) / 1_000_000).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Git Commit:</span>
                      <span className="font-mono text-xs">
                        {buildMetadataQuery.data.gitCommitHash.substring(0, 8)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Canister ID:</span>
                      <span className="font-mono text-xs break-all">
                        {buildMetadataQuery.data.canisterId.toString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Diagnostics */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Diagnostics
                </h3>
                
                {hasErrors ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Issues Detected</AlertTitle>
                    <AlertDescription>
                      {diagnosticLog.length} diagnostic entries captured
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle>No Issues</AlertTitle>
                    <AlertDescription>
                      Application is running normally
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={() => setShowDiagnostics(true)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Full Diagnostics Report
                </Button>
              </div>

              <Separator />

              {/* Help Links */}
              <div className="space-y-3">
                <h3 className="font-semibold">Help & Documentation</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    asChild
                  >
                    <a
                      href="https://internetcomputer.org/docs/current/developer-docs/getting-started/overview-of-icp"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Internet Computer Documentation
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    asChild
                  >
                    <a
                      href="https://identity.ic0.app/faq"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Internet Identity FAQ
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <DiagnosticsReportDialog
        open={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
      />
    </>
  );
}
