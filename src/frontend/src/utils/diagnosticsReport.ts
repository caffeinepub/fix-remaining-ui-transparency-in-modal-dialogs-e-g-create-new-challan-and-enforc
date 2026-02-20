import { getDiagnosticLog } from './runtimeDiagnostics';
import { safeStringify } from './safeSerialize';

/**
 * Utility to collect and format diagnostics report with enhanced Internet Identity authentication diagnostics, blank screen detection, CSP/CORS status, and browser compatibility information for troubleshooting authentication failures.
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
  errors: Array<{
    type: string;
    timestamp: string;
    path: string;
    hash: string;
    error: string;
    actorStatus?: string;
    authStatus?: string;
  }>;
}

export function generateDiagnosticsReport(): DiagnosticsReportData {
  const log = getDiagnosticLog();
  
  // Count Internet Identity specific events
  const authEvents = log.filter(e => e.type === 'auth-init').length;
  const blankScreenEvents = log.filter(e => e.type === 'auth-blank-screen').length;
  const popupBlockedEvents = log.filter(e => e.type === 'auth-popup-blocked').length;
  const timeoutEvents = log.filter(e => e.type === 'auth-timeout').length;
  
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
      timeoutEvents,
    },
    errors: log.map((entry) => ({
      type: entry.type,
      timestamp: new Date(entry.timestamp).toISOString(),
      path: entry.context.currentPath,
      hash: entry.context.currentHash,
      error: entry.error,
      actorStatus: entry.context.actorStatus,
      authStatus: entry.context.authStatus,
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
  
  text += `Total Errors Captured: ${report.errorCount}\n\n`;
  
  if (report.errorCount === 0) {
    text += 'No errors captured in this session.\n';
    text += '\nThe application is running normally.\n';
  } else {
    text += '--- ERRORS ---\n\n';
    
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
      text += `Error:\n${error.error}\n`;
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
