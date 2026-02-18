// Enhanced error normalization utilities with error classification

export type ErrorCategory =
  | 'actor-unavailable'
  | 'authorization'
  | 'validation'
  | 'network'
  | 'connection'
  | 'timeout'
  | 'unknown';

export interface ClassifiedError {
  category: ErrorCategory;
  message: string;
  originalError: unknown;
}

/**
 * Classify error into categories for better handling
 */
export function classifyError(error: unknown): ClassifiedError {
  const message = normalizeError(error);

  // Connection/probe failures
  if (
    message.includes('Probe timeout') ||
    message.includes('Connectivity probe failed') ||
    message.includes('Unable to reach backend')
  ) {
    return {
      category: 'connection',
      message: 'Unable to connect to the backend. Please check your network connection and try again.',
      originalError: error,
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
      message: 'The operation is taking longer than expected. Please wait or try again.',
      originalError: error,
    };
  }

  // Actor unavailable
  if (message.includes('Actor not available') || message.includes('actor is not ready')) {
    return {
      category: 'actor-unavailable',
      message: 'System is initializing. Please wait a moment and try again.',
      originalError: error,
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
    };
  }

  // Unknown errors
  return {
    category: 'unknown',
    message: message || 'An unexpected error occurred. Please try again.',
    originalError: error,
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
  return category === 'connection' || category === 'timeout' || category === 'network';
}

/**
 * Get user-friendly error message with fallback
 */
export function getUserFriendlyError(error: unknown, fallback?: string): string {
  const classified = classifyError(error);
  return classified.message || fallback || 'An error occurred. Please try again.';
}
