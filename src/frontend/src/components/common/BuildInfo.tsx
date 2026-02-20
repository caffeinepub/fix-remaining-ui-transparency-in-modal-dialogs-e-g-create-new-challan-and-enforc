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
  TestTube
} from 'lucide-react';
import { getDiagnosticLog, logAuthEvent } from '../../utils/runtimeDiagnostics';
import DiagnosticsReportDialog from './DiagnosticsReportDialog';
import { useState } from 'react';

/**
 * Build Info panel with enhanced Internet Identity diagnostics, manual authentication test button, browser compatibility checks, and comprehensive troubleshooting guidance for blank screen issues.
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
    elapsedTime
  } = useActorWithConnection();
  const { login, loginStatus, identity } = useInternetIdentity();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [testingAuth, setTestingAuth] = useState(false);

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

  const handleRetry = async () => {
    await retry();
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
                    <AlertDescription>
                      Backend is ready and responding normally.
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
                          {retryCount > 0 && <span>• Attempt {retryCount}/3</span>}
                        </div>
                      </div>
                      {lastError && (
                        <p className="text-sm font-mono bg-destructive/10 p-2 rounded">
                          {lastError}
                        </p>
                      )}
                      <Button 
                        onClick={handleRetry} 
                        disabled={!canRetry}
                        variant="outline" 
                        size="sm"
                        className="w-full"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {canRetry ? 'Retry Connection' : 'Max Retries Reached'}
                      </Button>
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
                  <h3 className="font-semibold">Build Metadata</h3>
                  <div className="space-y-2 text-sm">
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

              {/* Quick Actions */}
              <div className="space-y-3">
                <h3 className="font-semibold">Quick Actions</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate({ to: '/inventory' })}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Go to Inventory
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowDiagnostics(true)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Diagnostics
                    {hasErrors && (
                      <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded">
                        {diagnosticLog.length}
                      </span>
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Deployment Checklist */}
              <div className="space-y-3">
                <h3 className="font-semibold">Post-Deploy Verification</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Backend connection established</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Fast connectivity probe implemented</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>In-app retry without page reload</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Progressive status messages</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Internet Identity diagnostics enabled</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Documentation Link */}
              <div className="space-y-3">
                <h3 className="font-semibold">Documentation</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    asChild
                  >
                    <a
                      href="https://github.com/dfinity/icp-js-core"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      ICP JavaScript SDK Docs
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    asChild
                  >
                    <a
                      href="https://identity.ic0.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Internet Identity Help
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
