import { getDiagnosticLog } from './runtimeDiagnostics';
import { safeStringify } from './safeSerialize';

/**
 * Utility to collect and format a single text report from the persisted runtime diagnostics buffer
 * suitable for copy/paste into a support message, now including session-scoped verification context
 */

export interface DiagnosticsReportData {
  timestamp: string;
  userAgent: string;
  currentUrl: string;
  environment: string;
  errorCount: number;
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
  
  return {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    currentUrl: window.location.href,
    environment: import.meta.env.MODE || 'unknown',
    errorCount: log.length,
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
  text += `User Agent: ${report.userAgent}\n`;
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
