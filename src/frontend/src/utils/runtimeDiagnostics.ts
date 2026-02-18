import { safeErrorLog, safeStringify } from './safeSerialize';

/**
 * Runtime diagnostics helper that attaches global error listeners to capture and log
 * unhandled errors and promise rejections with full context for debugging deployment failures,
 * now including session-scoped verification context (actor/auth status, current route) and
 * enhanced actor initialization lifecycle signals (probe/init/timeout/retry/failure) for troubleshooting
 */

interface DiagnosticContext {
  timestamp: string;
  userAgent: string;
  currentPath: string;
  currentHash: string;
  environment: string;
  actorStatus?: string;
  authStatus?: string;
}

interface DiagnosticEntry {
  type: 'error' | 'unhandledrejection' | 'actor-init' | 'actor-probe' | 'actor-timeout' | 'actor-retry' | 'actor-failure';
  context: DiagnosticContext;
  error: string;
  timestamp: number;
}

interface SessionContext {
  actorStatus: string;
  authStatus: string;
}

const MAX_LOG_ENTRIES = 50;
const STORAGE_KEY = 'rentiq_diagnostics_log';

// In-memory buffer
let diagnosticLog: DiagnosticEntry[] = [];

// Session-scoped context for verification
let sessionContext: SessionContext = {
  actorStatus: 'unknown',
  authStatus: 'unknown',
};

/**
 * Update session context for diagnostics (called by useActorWithConnection and useInternetIdentity)
 */
export function updateDiagnosticSessionContext(updates: Partial<SessionContext>) {
  sessionContext = { ...sessionContext, ...updates };
}

function getDiagnosticContext(): DiagnosticContext {
  return {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    currentPath: window.location.pathname,
    currentHash: window.location.hash,
    environment: import.meta.env.MODE || 'unknown',
    actorStatus: sessionContext.actorStatus,
    authStatus: sessionContext.authStatus,
  };
}

function addDiagnosticEntry(entry: DiagnosticEntry) {
  // Add to in-memory buffer
  diagnosticLog.push(entry);
  
  // Keep only last MAX_LOG_ENTRIES
  if (diagnosticLog.length > MAX_LOG_ENTRIES) {
    diagnosticLog = diagnosticLog.slice(-MAX_LOG_ENTRIES);
  }
  
  // Persist to sessionStorage
  try {
    sessionStorage.setItem(STORAGE_KEY, safeStringify(diagnosticLog));
  } catch (e) {
    // Ignore storage errors (quota exceeded, etc.)
    console.warn('Failed to persist diagnostics to sessionStorage:', e);
  }
}

function logErrorWithContext(type: DiagnosticEntry['type'], error: unknown, context?: DiagnosticContext) {
  const ctx = context || getDiagnosticContext();
  
  console.error('=== Runtime Diagnostic Error ===');
  console.error('Type:', type);
  console.error('Context:', ctx);
  
  // Use safe error logging to prevent BigInt serialization issues
  const errorLog = safeErrorLog(error);
  console.error(errorLog);
  
  console.error('================================');
  
  // Add to diagnostic log
  addDiagnosticEntry({
    type,
    context: ctx,
    error: errorLog,
    timestamp: Date.now(),
  });
}

/**
 * Log actor initialization lifecycle events with enhanced stage tracking
 */
export function logActorInitEvent(
  event: 'start' | 'probe' | 'timeout' | 'retry' | 'failure',
  details?: string
) {
  const eventTypes: Record<typeof event, DiagnosticEntry['type']> = {
    start: 'actor-init',
    probe: 'actor-probe',
    timeout: 'actor-timeout',
    retry: 'actor-retry',
    failure: 'actor-failure',
  };

  logErrorWithContext(eventTypes[event], details || `Actor initialization ${event}`);
}

/**
 * Retrieve the current diagnostic log
 */
export function getDiagnosticLog(): DiagnosticEntry[] {
  // Try to load from sessionStorage first
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        diagnosticLog = parsed;
      }
    }
  } catch (e) {
    // Ignore parse errors
  }
  
  return [...diagnosticLog];
}

/**
 * Clear the diagnostic log
 */
export function clearDiagnosticLog() {
  diagnosticLog = [];
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // Ignore storage errors
  }
}

export function initializeRuntimeDiagnostics() {
  // Load existing log from sessionStorage
  getDiagnosticLog();
  
  // Global error handler
  window.addEventListener('error', (event) => {
    logErrorWithContext('error', event.error || event.message);
  });
  
  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    logErrorWithContext('unhandledrejection', event.reason);
  });
  
  console.log('Runtime diagnostics initialized');
}
