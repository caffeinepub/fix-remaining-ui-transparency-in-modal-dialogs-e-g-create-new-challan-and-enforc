import { createRouter, RouterProvider, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import AppLayout from './components/layout/AppLayout';
import AppErrorBoundary from './components/common/AppErrorBoundary';
import AuthApprovalGate from './components/common/AuthApprovalGate';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import ChallansPage from './pages/ChallansPage';
import ChallanDetailPage from './pages/ChallanDetailPage';
import ChallanPrintPage from './pages/ChallanPrintPage';
import PaymentsPage from './pages/PaymentsPage';
import PettyCashPage from './pages/PettyCashPage';
import ClientBalancesPage from './pages/ClientBalancesPage';
import ReportsPage from './pages/ReportsPage';
import AccessManagementPage from './pages/AccessManagementPage';
import { initializeRuntimeDiagnostics } from './utils/runtimeDiagnostics';

// Initialize runtime diagnostics early
initializeRuntimeDiagnostics();

// Single root route with AuthApprovalGate wrapping AppLayout
const rootRoute = createRootRoute({
  component: () => (
    <AuthApprovalGate>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </AuthApprovalGate>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
});

const inventoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inventory',
  component: InventoryPage,
});

const challansRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/challans',
  component: ChallansPage,
});

const challanDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/challans/$challanId',
  component: ChallanDetailPage,
});

const challanPrintRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/challans/$challanId/print',
  component: ChallanPrintPage,
});

const paymentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/payments',
  component: PaymentsPage,
});

const pettyCashRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/petty-cash',
  component: PettyCashPage,
});

const clientBalancesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/client-balances',
  component: ClientBalancesPage,
});

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports',
  component: ReportsPage,
});

const accessManagementRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/access-management',
  component: AccessManagementPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  inventoryRoute,
  challansRoute,
  challanDetailRoute,
  challanPrintRoute,
  paymentsRoute,
  pettyCashRoute,
  clientBalancesRoute,
  reportsRoute,
  accessManagementRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <RouterProvider router={router} />
    </AppErrorBoundary>
  );
}
