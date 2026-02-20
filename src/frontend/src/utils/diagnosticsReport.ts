import { getDiagnosticLog } from './runtimeDiagnostics';
import { safeStringify } from './safeSerialize';

/**
 * Utility to collect and format diagnostics report with enhanced backend connection diagnostics, probe tracking, response time analysis, and comprehensive troubleshooting guidance.
 */

export interface DiagnosticsReportData {
  timestamp: string;
  userAgent: string;
  currentUrl: string;
  environment: string;
  errorCount: number;
  browserInfo: {
    cookiesEnabled: boolean;
    storageAccessSupported: boolean;
    popupBlockerActive: boolean;
  };
  internetIdentityStatus: {
    authEvents: number;
    blankScreenEvents: number;
    popupBlockedEvents: number;
    timeoutEvents: number;
  };
  backendConnectionStatus: {
    probeAttempts: number;
    successfulProbes: number;
    failedProbes: number;
    timeoutEvents: number;
    averageResponseTime: number | null;
    lastProbeTimestamp: string | null;
  };
  errors: Array<{
    type: string;
    timestamp: string;
    path: string;
    hash: string;
    error: string;
    actorStatus?: string;
    authStatus?: string;
    connectionAttempt?: number;
    responseTime?: number;
  }>;
}

export function generateDiagnosticsReport(): DiagnosticsReportData {
  const log = getDiagnosticLog();
  
  // Count Internet Identity specific events
  const authEvents = log.filter(e => e.type === 'auth-init').length;
  const blankScreenEvents = log.filter(e => e.type === 'auth-blank-screen').length;
  const popupBlockedEvents = log.filter(e => e.type === 'auth-popup-blocked').length;
  const authTimeoutEvents = log.filter(e => e.type === 'auth-timeout').length;
  
  // Count backend connection events
  const probeAttempts = log.filter(e => e.type === 'actor-probe' || e.type === 'connection-probe').length;
  const successfulProbes = log.filter(e => e.type === 'connection-success').length;
  const failedProbes = log.filter(e => e.type === 'connection-failure').length;
  const connectionTimeouts = log.filter(e => e.type === 'actor-timeout').length;
  
  // Calculate average response time from successful probes
  const probesWithResponseTime = log.filter(e => 
    (e.type === 'connection-success' || e.type === 'connection-failure') && 
    e.context.responseTime !== undefined
  );
  const averageResponseTime = probesWithResponseTime.length > 0
    ? probesWithResponseTime.reduce((sum, e) => sum + (e.context.responseTime || 0), 0) / probesWithResponseTime.length
    : null;
  
  // Get last probe timestamp
  const lastProbe = [...log].reverse().find(e => 
    e.type === 'connection-success' || e.type === 'connection-failure'
  );
  const lastProbeTimestamp = lastProbe ? new Date(lastProbe.timestamp).toISOString() : null;
  
  // Detect popup blocker by attempting to open a window
  let popupBlockerActive = false;
  try {
    const testWindow = window.open('', '', 'width=1,height=1');
    if (testWindow) {
      testWindow.close();
      popupBlockerActive = false;
    } else {
      popupBlockerActive = true;
    }
  } catch (e) {
    popupBlockerActive = true;
  }
  
  return {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    currentUrl: window.location.href,
    environment: import.meta.env.MODE || 'unknown',
    errorCount: log.length,
    browserInfo: {
      cookiesEnabled: navigator.cookieEnabled,
      storageAccessSupported: 'hasStorageAccess' in document,
      popupBlockerActive,
    },
    internetIdentityStatus: {
      authEvents,
      blankScreenEvents,
      popupBlockedEvents,
      timeoutEvents: authTimeoutEvents,
    },
    backendConnectionStatus: {
      probeAttempts,
      successfulProbes,
      failedProbes,
      timeoutEvents: connectionTimeouts,
      averageResponseTime,
      lastProbeTimestamp,
    },
    errors: log.map((entry) => ({
      type: entry.type,
      timestamp: new Date(entry.timestamp).toISOString(),
      path: entry.context.currentPath,
      hash: entry.context.currentHash,
      error: entry.error,
      actorStatus: entry.context.actorStatus,
      authStatus: entry.context.authStatus,
      connectionAttempt: entry.context.connectionAttempt,
      responseTime: entry.context.responseTime,
    })),
  };
}

export function formatDiagnosticsReportAsText(): string {
  const report = generateDiagnosticsReport();
  
  let text = '=== RENTIQ DIAGNOSTICS REPORT ===\n\n';
  text += `Generated: ${report.timestamp}\n`;
  text += `Environment: ${report.environment}\n`;
  text += `Current URL: ${report.currentUrl}\n`;
  text += `User Agent: ${report.userAgent}\n\n`;
  
  text += '--- BROWSER INFORMATION ---\n';
  text += `Cookies Enabled: ${report.browserInfo.cookiesEnabled}\n`;
  text += `Storage Access API: ${report.browserInfo.storageAccessSupported ? 'Supported' : 'Not Supported'}\n`;
  text += `Popup Blocker: ${report.browserInfo.popupBlockerActive ? 'ACTIVE (may block authentication)' : 'Not Detected'}\n\n`;
  
  text += '--- BACKEND CONNECTION STATUS ---\n';
  text += `Probe Attempts: ${report.backendConnectionStatus.probeAttempts}\n`;
  text += `Successful Probes: ${report.backendConnectionStatus.successfulProbes}\n`;
  text += `Failed Probes: ${report.backendConnectionStatus.failedProbes}\n`;
  text += `Timeout Events: ${report.backendConnectionStatus.timeoutEvents}\n`;
  if (report.backendConnectionStatus.averageResponseTime !== null) {
    text += `Average Response Time: ${Math.round(report.backendConnectionStatus.averageResponseTime)}ms\n`;
  }
  if (report.backendConnectionStatus.lastProbeTimestamp) {
    text += `Last Probe: ${report.backendConnectionStatus.lastProbeTimestamp}\n`;
  }
  text += '\n';
  
  if (report.backendConnectionStatus.failedProbes > report.backendConnectionStatus.successfulProbes) {
    text += '⚠️  CONNECTION ISSUES DETECTED - Possible causes:\n';
    text += '   - Backend canister is not deployed or unreachable\n';
    text += '   - Network connectivity problems\n';
    text += '   - Firewall or proxy blocking Internet Computer network\n';
    text += '   - Canister is initializing after deployment\n';
    text += '   - Browser compatibility issues\n\n';
  }
  
  text += '--- INTERNET IDENTITY STATUS ---\n';
  text += `Auth Initialization Events: ${report.internetIdentityStatus.authEvents}\n`;
  text += `Blank Screen Events: ${report.internetIdentityStatus.blankScreenEvents}\n`;
  text += `Popup Blocked Events: ${report.internetIdentityStatus.popupBlockedEvents}\n`;
  text += `Timeout Events: ${report.internetIdentityStatus.timeoutEvents}\n\n`;
  
  if (report.internetIdentityStatus.blankScreenEvents > 0) {
    text += '⚠️  BLANK SCREEN DETECTED - Possible causes:\n';
    text += '   - Popup blocker preventing authorization window\n';
    text += '   - Third-party cookies blocked by browser\n';
    text += '   - CSP restrictions blocking Internet Identity iframe\n';
    text += '   - Browser in incognito/private mode\n\n';
  }
  
  text += `Total Diagnostic Entries: ${report.errorCount}\n\n`;
  
  if (report.errorCount === 0) {
    text += 'No diagnostic entries captured in this session.\n';
    text += '\nThe application is running normally.\n';
  } else {
    text += '--- DIAGNOSTIC ENTRIES ---\n\n';
    
    report.errors.forEach((error, index) => {
      text += `[${index + 1}] ${error.type.toUpperCase()}\n`;
      text += `Timestamp: ${error.timestamp}\n`;
      text += `Route: ${error.path}${error.hash}\n`;
      if (error.actorStatus) {
        text += `Actor Status: ${error.actorStatus}\n`;
      }
      if (error.authStatus) {
        text += `Auth Status: ${error.authStatus}\n`;
      }
      if (error.connectionAttempt !== undefined) {
        text += `Connection Attempt: ${error.connectionAttempt}\n`;
      }
      if (error.responseTime !== undefined) {
        text += `Response Time: ${error.responseTime}ms\n`;
      }
      text += `Details:\n${error.error}\n`;
      text += '\n' + '-'.repeat(60) + '\n\n';
    });
  }
  
  text += '=== END REPORT ===';
  
  return text;
}

export function copyDiagnosticsReportToClipboard(): Promise<void> {
  const text = formatDiagnosticsReportAsText();
  return navigator.clipboard.writeText(text);
}
