import { AlertCircle, RefreshCw, LogIn, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { classifyError, getTroubleshootingSteps } from '../../utils/errors';
import { safeErrorDetails } from '../../utils/safeSerialize';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';

interface QueryErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

/**
 * Reusable error state component for query failures with retry, sign-in actions, troubleshooting guidance, and expandable technical details
 */
export default function QueryErrorState({ error, onRetry, title = 'Error Loading Data' }: QueryErrorStateProps) {
  const { login, identity } = useInternetIdentity();
  const classified = classifyError(error);
  const troubleshootingSteps = getTroubleshootingSteps(error);
  const isAuthenticated = !!identity;
  const [showDetails, setShowDetails] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  // Check if error is authorization-related
  const isUnauthorized = classified.category === 'authorization';

  // Extract safe error details (no BigInt serialization)
  const details = safeErrorDetails(error);

  return (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p>{classified.message}</p>
        
        {/* Troubleshooting Section */}
        {troubleshootingSteps.length > 0 && (
          <Collapsible open={showTroubleshooting} onOpenChange={setShowTroubleshooting}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between bg-white hover:bg-gray-50"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Troubleshooting Steps
                </span>
                {showTroubleshooting ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="rounded-md bg-muted p-3 text-sm">
                <ul className="list-disc list-inside space-y-1">
                  {troubleshootingSteps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ul>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Technical Details Section */}
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between bg-white hover:bg-gray-50"
            >
              <span>Technical Details</span>
              {showDetails ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="rounded-md bg-gray-900 p-3 text-xs text-gray-100">
              <div className="mb-1 font-semibold text-red-400">Error Category:</div>
              <pre className="mb-3 whitespace-pre-wrap break-words">{classified.category}</pre>
              
              <div className="mb-1 font-semibold text-red-400">Error Message:</div>
              <pre className="mb-3 whitespace-pre-wrap break-words">{details.raw}</pre>
              
              {details.stack && (
                <>
                  <div className="mb-1 font-semibold text-red-400">Stack Trace:</div>
                  <pre className="whitespace-pre-wrap break-words">{details.stack}</pre>
                </>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex gap-2">
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="bg-white hover:bg-gray-50"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          )}
          {isUnauthorized && !isAuthenticated && (
            <Button
              variant="outline"
              size="sm"
              onClick={login}
              className="bg-white hover:bg-gray-50"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
