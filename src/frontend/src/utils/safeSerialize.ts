/**
 * Safe serialization helpers to prevent BigInt serialization errors
 * when displaying technical details or diagnostics
 */

/**
 * Safely stringify any value, converting BigInt to string
 */
export function safeStringify(value: unknown, indent = 2): string {
  try {
    return JSON.stringify(
      value,
      (_, v) => {
        // Convert BigInt to string with 'n' suffix for clarity
        if (typeof v === 'bigint') {
          return `${v.toString()}n`;
        }
        return v;
      },
      indent
    );
  } catch (error) {
    // Fallback to String() if JSON.stringify fails for any reason
    return String(value);
  }
}

/**
 * Extract safe error details for display without triggering BigInt serialization
 */
export function safeErrorDetails(error: unknown): {
  message: string;
  stack?: string;
  raw: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      raw: error.toString(),
    };
  }
  
  // For non-Error objects, safely convert to string
  const raw = typeof error === 'object' && error !== null
    ? safeStringify(error)
    : String(error);
  
  return {
    message: raw,
    raw,
  };
}

/**
 * Safely format error for logging without BigInt serialization issues
 */
export function safeErrorLog(error: unknown): string {
  const details = safeErrorDetails(error);
  
  let output = `Error: ${details.message}`;
  
  if (details.stack) {
    output += `\n\nStack Trace:\n${details.stack}`;
  }
  
  return output;
}
