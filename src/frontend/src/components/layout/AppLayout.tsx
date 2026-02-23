import { Link, useLocation } from '@tanstack/react-router';
import { Home, Package, FileText, CreditCard, Wallet, Users, BarChart3, Shield, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useIsCallerAdmin } from '../../hooks/useApprovalStatus';
import { useQueryClient } from '@tanstack/react-query';
import BuildInfo from '../common/BuildInfo';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { identity, clear } = useInternetIdentity();
  const { data: isAdmin } = useIsCallerAdmin();
  const queryClient = useQueryClient();

  const isPrintRoute = currentPath.includes('/print');

  if (isPrintRoute) {
    return <>{children}</>;
  }

  const handleSignOut = async () => {
    await clear();
    queryClient.clear();
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/inventory', label: 'Inventory', icon: Package },
    { path: '/challans', label: 'Challans', icon: FileText },
    { path: '/payments', label: 'Payments', icon: CreditCard },
    { path: '/petty-cash', label: 'Petty Cash', icon: Wallet },
    { path: '/client-balances', label: 'Client Balances', icon: Users },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-2xl font-bold text-primary">
              RENTIQ
            </Link>
            <nav className="hidden md:flex gap-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  to="/access-management"
                  className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${
                    currentPath === '/access-management' ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  Access Management
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <BuildInfo />
            {identity && (
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>

      <footer className="border-t bg-card py-4 text-center text-sm text-muted-foreground">
        <p>
          © {new Date().getFullYear()} RENTIQ. Built with ❤️ using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
              typeof window !== 'undefined' ? window.location.hostname : 'unknown-app'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
