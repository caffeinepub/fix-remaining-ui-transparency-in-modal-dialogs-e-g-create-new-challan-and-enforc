import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { safeErrorDetails } from '../../utils/safeSerialize';
import { formatDiagnosticsReportAsText } from '../../utils/diagnosticsReport';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

/**
 * Top-level error boundary that captures render-time errors and displays a fallback UI with
 * expandable technical details and a direct 'Copy Diagnostics' button that includes enhanced
 * diagnostics context for deployment verification
 */
export default class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AppErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    });
    window.location.href = '/';
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  handleCopyDiagnostics = async () => {
    try {
      const reportText = formatDiagnosticsReportAsText();
      await navigator.clipboard.writeText(reportText);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (error) {
      console.error('Failed to copy diagnostics:', error);
      alert('Failed to copy diagnostics. Please open DevTools console and copy the error manually.');
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use safe error details to prevent BigInt serialization
      const details = safeErrorDetails(this.state.error);

      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-2xl">
            <Alert variant="destructive">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle className="text-lg font-semibold">Application Failed to Load</AlertTitle>
              <AlertDescription className="mt-3 space-y-4">
                <p className="text-sm">
                  The application encountered an unexpected error and could not continue. Please try reloading the page.
                  If the problem persists, copy the diagnostics report below and contact support.
                </p>
                
                <Collapsible open={this.state.showDetails} onOpenChange={this.toggleDetails}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between bg-white hover:bg-gray-50"
                    >
                      <span>Technical Details</span>
                      {this.state.showDetails ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <div className="rounded-md bg-gray-900 p-4 text-xs text-gray-100">
                      <div className="mb-2 font-semibold text-red-400">Error:</div>
                      <pre className="mb-4 whitespace-pre-wrap break-words">
                        {details.raw}
                      </pre>
                      
                      {details.stack && (
                        <>
                          <div className="mb-2 font-semibold text-red-400">Stack Trace:</div>
                          <pre className="mb-4 whitespace-pre-wrap break-words">
                            {details.stack}
                          </pre>
                        </>
                      )}
                      
                      {this.state.errorInfo?.componentStack && (
                        <>
                          <div className="mb-2 font-semibold text-red-400">Component Stack:</div>
                          <pre className="whitespace-pre-wrap break-words">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <p className="text-xs text-amber-800">
                    <strong>For deployment verification:</strong> Click "Copy Diagnostics" below, then also
                    capture browser console logs (F12 → Console tab) and any failed network requests
                    (F12 → Network tab) when reporting this issue.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={this.handleReset}
                    className="bg-white hover:bg-gray-50"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reload Application
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={this.handleCopyDiagnostics}
                    className="bg-white hover:bg-gray-50"
                  >
                    {this.state.copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Diagnostics
                      </>
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
