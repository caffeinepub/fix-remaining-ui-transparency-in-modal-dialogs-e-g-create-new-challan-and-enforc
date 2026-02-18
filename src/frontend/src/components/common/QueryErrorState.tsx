import { AlertCircle, RefreshCw, LogIn, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { normalizeError } from '../../utils/errors';
import { safeErrorDetails } from '../../utils/safeSerialize';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';

interface QueryErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

/**
 * Reusable error state component for query failures with retry, sign-in actions, and expandable technical details
 */
export default function QueryErrorState({ error, onRetry, title = 'Error Loading Data' }: QueryErrorStateProps) {
  const { login, identity } = useInternetIdentity();
  const errorMessage = normalizeError(error);
  const isAuthenticated = !!identity;
  const [showDetails, setShowDetails] = useState(false);

  // Check if error is authorization-related
  const isUnauthorized = errorMessage.includes('not authorized') || errorMessage.includes('Unauthorized');

  // Extract safe error details (no BigInt serialization)
  const details = safeErrorDetails(error);

  return (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p>{errorMessage}</p>
        
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
              <div className="mb-1 font-semibold text-red-400">Error:</div>
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
