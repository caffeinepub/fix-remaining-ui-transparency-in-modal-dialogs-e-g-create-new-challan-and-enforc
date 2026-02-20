// Enhanced error normalization utilities with expanded error classification

export type ErrorCategory =
  | 'actor-unavailable'
  | 'authorization'
  | 'validation'
  | 'network'
  | 'connection'
  | 'timeout'
  | 'probe-failure'
  | 'canister-unreachable'
  | 'initialization-failure'
  | 'unknown';

export interface ClassifiedError {
  category: ErrorCategory;
  message: string;
  originalError: unknown;
  troubleshooting?: string[];
}

/**
 * Classify error into categories for better handling with troubleshooting guidance
 */
export function classifyError(error: unknown): ClassifiedError {
  const message = normalizeError(error);

  // Probe failures
  if (
    message.includes('Probe timeout') ||
    message.includes('Connectivity probe failed')
  ) {
    return {
      category: 'probe-failure',
      message: 'Unable to establish initial connection to the backend. The health check probe failed.',
      originalError: error,
      troubleshooting: [
        'Check your internet connection',
        'Verify the backend canister is deployed and running',
        'Try disabling VPN or proxy if enabled',
        'Check browser console for CORS or network errors',
      ],
    };
  }

  // Connection failures
  if (
    message.includes('Unable to reach backend') ||
    message.includes('Connection failed') ||
    message.includes('refused') ||
    message.includes('unreachable')
  ) {
    return {
      category: 'connection',
      message: 'Unable to connect to the backend. The canister may be unreachable or not deployed.',
      originalError: error,
      troubleshooting: [
        'Verify the backend canister is deployed',
        'Check if the Internet Computer network is accessible',
        'Try accessing from a different network',
        'Contact support if the issue persists',
      ],
    };
  }

  // Timeout errors
  if (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('taking longer than expected')
  ) {
    return {
      category: 'timeout',
      message: 'The operation is taking longer than expected. The backend may be slow to respond or initializing.',
      originalError: error,
      troubleshooting: [
        'Wait a moment and try again',
        'Check your network speed',
        'The canister may be initializing after deployment',
        'Try again in a few minutes',
      ],
    };
  }

  // Canister unreachable
  if (
    message.includes('canister') &&
    (message.includes('not found') || message.includes('does not exist'))
  ) {
    return {
      category: 'canister-unreachable',
      message: 'Backend canister not found. The canister may not be deployed or the canister ID is incorrect.',
      originalError: error,
      troubleshooting: [
        'Verify the canister is deployed',
        'Check the canister ID configuration',
        'Ensure you are accessing the correct deployment URL',
        'Contact the administrator',
      ],
    };
  }

  // Actor unavailable
  if (message.includes('Actor not available') || message.includes('actor is not ready')) {
    return {
      category: 'actor-unavailable',
      message: 'System is initializing. Please wait a moment and try again.',
      originalError: error,
      troubleshooting: [
        'Wait a few seconds for initialization to complete',
        'Refresh the page',
        'Check the Build Info panel for actor status',
      ],
    };
  }

  // Authorization errors
  if (
    message.includes('Unauthorized') ||
    message.includes('sign in') ||
    message.includes('authentication required') ||
    message.includes('Only users can perform this action')
  ) {
    return {
      category: 'authorization',
      message: 'You need to sign in to perform this action.',
      originalError: error,
      troubleshooting: [
        'Sign in with Internet Identity',
        'Check if your session has expired',
        'Verify you have the required permissions',
      ],
    };
  }

  // Validation errors (from backend traps or client-side)
  if (
    message.includes('already exists') ||
    message.includes('not found') ||
    message.includes('required') ||
    message.includes('invalid') ||
    message.includes('must be') ||
    message.includes('cannot') ||
    message.includes('locked') ||
    message.includes('returned challan')
  ) {
    return {
      category: 'validation',
      message,
      originalError: error,
    };
  }

  // Network errors
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection')
  ) {
    return {
      category: 'network',
      message: 'Network error. Please check your connection and try again.',
      originalError: error,
      troubleshooting: [
        'Check your internet connection',
        'Try disabling browser extensions',
        'Check firewall settings',
        'Try a different browser',
      ],
    };
  }

  // Unknown errors
  return {
    category: 'unknown',
    message: message || 'An unexpected error occurred. Please try again.',
    originalError: error,
    troubleshooting: [
      'Try refreshing the page',
      'Clear browser cache and cookies',
      'Check the Build Info panel for diagnostics',
      'Contact support if the issue persists',
    ],
  };
}

/**
 * Normalize error to user-friendly string message
 */
export function normalizeError(error: unknown): string {
  if (!error) {
    return 'An unknown error occurred';
  }

  // String error
  if (typeof error === 'string') {
    return error;
  }

  // Error object with message
  if (error instanceof Error) {
    return error.message;
  }

  // Object with message property
  if (typeof error === 'object' && 'message' in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === 'string') {
      return msg;
    }
  }

  // Try to stringify
  try {
    return JSON.stringify(error);
  } catch {
    return 'An unknown error occurred';
  }
}

/**
 * Check if error is an authorization error
 */
export function isAuthorizationError(error: unknown): boolean {
  return classifyError(error).category === 'authorization';
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  return classifyError(error).category === 'validation';
}

/**
 * Check if error is a connection error
 */
export function isConnectionError(error: unknown): boolean {
  const category = classifyError(error).category;
  return (
    category === 'connection' ||
    category === 'timeout' ||
    category === 'network' ||
    category === 'probe-failure' ||
    category === 'canister-unreachable'
  );
}

/**
 * Get user-friendly error message with fallback
 */
export function getUserFriendlyError(error: unknown, fallback?: string): string {
  const classified = classifyError(error);
  return classified.message || fallback || 'An error occurred. Please try again.';
}

/**
 * Get troubleshooting steps for an error
 */
export function getTroubleshootingSteps(error: unknown): string[] {
  const classified = classifyError(error);
  return classified.troubleshooting || [];
}
