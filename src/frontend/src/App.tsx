import { createRouter, RouterProvider, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import AppLayout from './components/layout/AppLayout';
import AppErrorBoundary from './components/common/AppErrorBoundary';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import ChallansPage from './pages/ChallansPage';
import ChallanDetailPage from './pages/ChallanDetailPage';
import ChallanPrintPage from './pages/ChallanPrintPage';
import PaymentsPage from './pages/PaymentsPage';
import PettyCashPage from './pages/PettyCashPage';
import ClientBalancesPage from './pages/ClientBalancesPage';
import ReportsPage from './pages/ReportsPage';
import { initializeRuntimeDiagnostics } from './utils/runtimeDiagnostics';

initializeRuntimeDiagnostics();

const rootRoute = createRootRoute({
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
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
