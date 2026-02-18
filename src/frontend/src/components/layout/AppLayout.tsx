import { ReactNode } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { Home, Package, FileText, CreditCard, Wallet, Users, BarChart3, ShieldCheck } from 'lucide-react';
import BuildInfo from '../common/BuildInfo';
import { useIsAdmin } from '../../hooks/useAccessManagement';
import { useAppMode } from '../../hooks/useAppMode';
import { Badge } from '@/components/ui/badge';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: isAdmin } = useIsAdmin();
  const { mode, isAdminMode, isStaffMode } = useAppMode();

  // Check if current route is a print route
  const isPrintRoute = location.pathname.includes('/print');

  // For print routes, render only the content without layout
  if (isPrintRoute) {
    return <>{children}</>;
  }

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/inventory', label: 'Inventory', icon: Package },
    { path: '/challans', label: 'Challans', icon: FileText },
    { path: '/payments', label: 'Payments', icon: CreditCard },
    { path: '/petty-cash', label: 'Petty Cash', icon: Wallet },
    { path: '/client-balances', label: 'Client Balances', icon: Users },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
  ];

  // Add access management link only for admins
  if (isAdmin) {
    navItems.push({ path: '/access-management', label: 'Access Management', icon: ShieldCheck });
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">RENTIQ</h1>
            {isAdminMode && (
              <Badge variant="secondary" className="bg-yellow-500 text-yellow-950 hover:bg-yellow-600">
                Admin Mode
              </Badge>
            )}
            {isStaffMode && (
              <Badge variant="secondary" className="bg-blue-500 text-blue-950 hover:bg-blue-600">
                Staff Mode
              </Badge>
            )}
          </div>
          <BuildInfo />
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <button
                  key={item.path}
                  onClick={() => navigate({ to: item.path })}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} RENTIQ. Built with ❤️ using{' '}
            <a
              href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                typeof window !== 'undefined' ? window.location.hostname : 'rentiq-app'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
