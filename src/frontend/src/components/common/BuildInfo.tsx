import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  RefreshCw,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { useActor } from "../../hooks/useActor";
import { formatDiagnosticsReportAsText } from "../../utils/diagnosticsReport";

export default function BuildInfo() {
  const { actor, isFetching } = useActor();
  const [expanded, setExpanded] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const isReady = !!actor && !isFetching;
  const isConnecting = isFetching;

  const handleTestConnection = async () => {
    if (!actor) {
      setTestResult("No actor available");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const start = Date.now();
      const result = await actor.healthCheck();
      const ms = Date.now() - start;
      setTestResult(`✅ Health check OK in ${ms}ms. Build time: ${result}`);
    } catch (err: any) {
      setTestResult(`❌ Health check failed: ${err?.message || String(err)}`);
    } finally {
      setTesting(false);
    }
  };

  const handleCopyDiagnostics = async () => {
    try {
      const report = formatDiagnosticsReportAsText();
      await navigator.clipboard.writeText(report);
      toast.success("Diagnostics copied to clipboard");
    } catch {
      toast.error("Failed to copy diagnostics");
    }
  };

  const statusColor = isReady
    ? "bg-green-500"
    : isConnecting
      ? "bg-yellow-500"
      : "bg-destructive";

  const statusLabel = isReady
    ? "Connected"
    : isConnecting
      ? "Connecting…"
      : "Error";

  return (
    <div className="border border-border rounded-lg p-4 bg-card text-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${statusColor}`}
          />
          <span className="font-medium text-foreground">
            Backend: {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-muted-foreground">Status</div>
            <div className="font-mono">
              {isReady ? "ready" : isConnecting ? "initializing" : "error"}
            </div>
            <div className="text-muted-foreground">Host</div>
            <div className="font-mono break-all">
              {window.location.hostname.includes("localhost")
                ? "http://localhost:4943"
                : "https://ic0.app"}
            </div>
            <div className="text-muted-foreground">Environment</div>
            <div className="font-mono">
              {window.location.hostname.includes("localhost")
                ? "local"
                : "production"}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing || !actor}
              className="flex-1"
            >
              {testing ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3 mr-1" />
              )}
              Test Health Check
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopyDiagnostics}>
              <Copy className="h-3 w-3 mr-1" />
              Copy Diagnostics
            </Button>
          </div>

          {testResult && (
            <div className="bg-muted rounded p-2 text-xs font-mono break-all">
              {testResult}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
