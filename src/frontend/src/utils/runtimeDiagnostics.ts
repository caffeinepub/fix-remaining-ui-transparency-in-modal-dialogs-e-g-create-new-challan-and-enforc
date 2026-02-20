import { safeErrorLog, safeStringify } from './safeSerialize';

/**
 * Runtime diagnostics helper with enhanced Internet Identity authentication lifecycle tracking, blank screen detection, authorization flow diagnostics, connection probe tracking, and comprehensive error context capture for troubleshooting deployment and authentication failures.
 */

interface DiagnosticContext {
  timestamp: string;
  userAgent: string;
  currentPath: string;
  currentHash: string;
  environment: string;
  actorStatus?: string;
  authStatus?: string;
  connectionAttempt?: number;
  responseTime?: number;
}

interface DiagnosticEntry {
  type: 'error' | 'unhandledrejection' | 'actor-init' | 'actor-probe' | 'actor-timeout' | 'actor-retry' | 'actor-failure' | 'auth-init' | 'auth-blank-screen' | 'auth-popup-blocked' | 'auth-timeout' | 'connection-probe' | 'connection-success' | 'connection-failure';
  context: DiagnosticContext;
  error: string;
  timestamp: number;
}

interface SessionContext {
  actorStatus: string;
  authStatus: string;
  connectionAttempt: number;
}

const MAX_LOG_ENTRIES = 100; // Increased from 50
const STORAGE_KEY = 'rentiq_diagnostics_log';

// In-memory buffer
let diagnosticLog: DiagnosticEntry[] = [];

// Session-scoped context for verification
let sessionContext: SessionContext = {
  actorStatus: 'unknown',
  authStatus: 'unknown',
  connectionAttempt: 0,
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
    connectionAttempt: sessionContext.connectionAttempt,
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

  // Increment connection attempt counter for probes and retries
  if (event === 'probe' || event === 'retry') {
    sessionContext.connectionAttempt += 1;
  }

  logErrorWithContext(eventTypes[event], details || `Actor initialization ${event}`);
}

/**
 * Log connection probe events with response time tracking
 */
export function logConnectionProbe(
  success: boolean,
  responseTime: number,
  details?: string
) {
  const type: DiagnosticEntry['type'] = success ? 'connection-success' : 'connection-failure';
  const message = details || (success ? 'Connection probe succeeded' : 'Connection probe failed');
  
  const context = getDiagnosticContext();
  context.responseTime = responseTime;
  
  console.log(`=== Connection Probe ${success ? 'Success' : 'Failure'} ===`);
  console.log('Response Time:', responseTime, 'ms');
  console.log('Details:', message);
  console.log('Attempt:', context.connectionAttempt);
  console.log('===========================================');
  
  logErrorWithContext(type, message, context);
}

/**
 * Log Internet Identity authentication events for blank screen diagnostics
 */
export function logAuthEvent(
  event: 'init' | 'blank-screen' | 'popup-blocked' | 'timeout',
  details?: string
) {
  const eventTypes: Record<typeof event, DiagnosticEntry['type']> = {
    init: 'auth-init',
    'blank-screen': 'auth-blank-screen',
    'popup-blocked': 'auth-popup-blocked',
    timeout: 'auth-timeout',
  };

  const errorMessage = details || `Internet Identity ${event}`;
  
  console.warn('=== Internet Identity Diagnostic ===');
  console.warn('Event:', event);
  console.warn('Details:', errorMessage);
  console.warn('Timestamp:', new Date().toISOString());
  console.warn('Domain:', window.location.hostname);
  console.warn('User Agent:', navigator.userAgent.substring(0, 100));
  console.warn('Cookies Enabled:', navigator.cookieEnabled);
  console.warn('====================================');

  logErrorWithContext(eventTypes[event], errorMessage);
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
  sessionContext.connectionAttempt = 0;
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
  console.log('Domain:', window.location.hostname);
  console.log('Environment:', import.meta.env.MODE);
}
