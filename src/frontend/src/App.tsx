import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import React, { useState, useCallback } from "react";
import AppErrorBoundary from "./components/common/AppErrorBoundary";
import AuthApprovalGate from "./components/common/AuthApprovalGate";
import BackendConnectionGate from "./components/common/BackendConnectionGate";
import SignInScreen from "./components/common/SignInScreen";
import AppLayout from "./components/layout/AppLayout";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import AccessManagementPage from "./pages/AccessManagementPage";
import ChallanDetailPage from "./pages/ChallanDetailPage";
import ChallanPrintPage from "./pages/ChallanPrintPage";
import ChallansPage from "./pages/ChallansPage";
import ClientBalancesPage from "./pages/ClientBalancesPage";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import PaymentsPage from "./pages/PaymentsPage";
import PettyCashPage from "./pages/PettyCashPage";
import ReportsPage from "./pages/ReportsPage";

export type PageName =
  | "dashboard"
  | "inventory"
  | "challans"
  | "challan-detail"
  | "challan-print"
  | "payments"
  | "petty-cash"
  | "client-balances"
  | "reports"
  | "access-management";

export interface AppState {
  page: PageName;
  params?: Record<string, string>;
}

interface AppNavContextValue {
  appState: AppState;
  navigate: (page: PageName, params?: Record<string, string>) => void;
}

export const AppNavContext = React.createContext<AppNavContextValue>({
  appState: { page: "dashboard" },
  navigate: () => {},
});

export function useAppNav() {
  return React.useContext(AppNavContext);
}

function AppRouter() {
  const [appState, setAppState] = useState<AppState>({ page: "dashboard" });

  const navigate = useCallback(
    (page: PageName, params?: Record<string, string>) => {
      setAppState({ page, params });
    },
    [],
  );

  const renderPage = () => {
    switch (appState.page) {
      case "dashboard":
        return <DashboardPage />;
      case "inventory":
        return <InventoryPage />;
      case "challans":
        return <ChallansPage />;
      case "challan-detail":
        return <ChallanDetailPage challanId={appState.params?.id || ""} />;
      case "challan-print":
        return <ChallanPrintPage challanId={appState.params?.id || ""} />;
      case "payments":
        return <PaymentsPage />;
      case "petty-cash":
        return <PettyCashPage />;
      case "client-balances":
        return <ClientBalancesPage />;
      case "reports":
        return <ReportsPage />;
      case "access-management":
        return <AccessManagementPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <AppNavContext.Provider value={{ appState, navigate }}>
      <AppLayout>{renderPage()}</AppLayout>
    </AppNavContext.Provider>
  );
}

function AuthenticatedApp() {
  const { identity, isInitializing } = useInternetIdentity();

  // While the auth client is initializing (checking stored identity), show a minimal loader
  if (isInitializing) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--sidebar-bg)" }}
      >
        <div className="text-center">
          <div
            className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4"
            style={{
              borderColor: "var(--sidebar-active)",
              borderTopColor: "transparent",
            }}
          />
          <p style={{ color: "var(--sidebar-fg)" }} className="text-sm">
            Loading RentIQ...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated — show login screen immediately, no backend connection attempted
  if (!identity) {
    return <SignInScreen />;
  }

  // Authenticated — now connect to backend and check approval
  return (
    <BackendConnectionGate>
      <AuthApprovalGate>
        <AppRouter />
      </AuthApprovalGate>
    </BackendConnectionGate>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
      >
        <AuthenticatedApp />
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
