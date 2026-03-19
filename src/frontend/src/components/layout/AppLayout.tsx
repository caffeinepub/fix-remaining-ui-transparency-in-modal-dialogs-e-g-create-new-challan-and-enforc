import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  ChevronRight,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useAppNav } from "../../App";
import { useIsCallerAdmin } from "../../hooks/useApprovalStatus";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "challans", label: "Challans", icon: FileText },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "petty-cash", label: "Petty Cash", icon: Wallet },
  { id: "client-balances", label: "Client Balances", icon: Users },
  { id: "reports", label: "Reports", icon: BarChart3 },
] as const;

interface Props {
  children: React.ReactNode;
}

export default function AppLayout({ children }: Props) {
  const { identity, clear } = useInternetIdentity();
  const { isAdmin } = useIsCallerAdmin();
  const { appState, navigate } = useAppNav();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  const currentPage = appState.page;

  const handleNav = (id: string) => {
    navigate(id as any);
    setSidebarOpen(false);
  };

  const principalShort = identity
    ? `${identity.getPrincipal().toString().slice(0, 12)}...`
    : "";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className="px-4 py-5 border-b"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-lg shrink-0"
            style={{
              background: "var(--sidebar-active)",
              color: "var(--sidebar-active-fg)",
            }}
          >
            R
          </div>
          <div>
            <div
              className="font-bold text-sm leading-tight"
              style={{ color: "var(--sidebar-fg)" }}
            >
              RentIQ
            </div>
            <div className="text-xs" style={{ color: "var(--sidebar-muted)" }}>
              Udaipur
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = currentPage === id;
          return (
            <button
              type="button"
              key={id}
              onClick={() => handleNav(id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: active ? "var(--sidebar-active)" : "transparent",
                color: active
                  ? "var(--sidebar-active-fg)"
                  : "var(--sidebar-fg)",
              }}
              onMouseEnter={(e) => {
                if (!active)
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--sidebar-accent)";
              }}
              onMouseLeave={(e) => {
                if (!active)
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
              }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
              {active && <ChevronRight className="w-3 h-3 ml-auto" />}
            </button>
          );
        })}

        {isAdmin && (
          <button
            type="button"
            onClick={() => handleNav("access-management")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background:
                currentPage === "access-management"
                  ? "var(--sidebar-active)"
                  : "transparent",
              color:
                currentPage === "access-management"
                  ? "var(--sidebar-active-fg)"
                  : "var(--sidebar-fg)",
            }}
            onMouseEnter={(e) => {
              if (currentPage !== "access-management")
                (e.currentTarget as HTMLElement).style.background =
                  "var(--sidebar-accent)";
            }}
            onMouseLeave={(e) => {
              if (currentPage !== "access-management")
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
            }}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Access Management</span>
            {currentPage === "access-management" && (
              <ChevronRight className="w-3 h-3 ml-auto" />
            )}
          </button>
        )}
      </nav>

      {/* User */}
      <div
        className="px-3 py-3 border-t"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <div className="flex items-center gap-2 mb-2 px-1">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{
              background: "var(--sidebar-accent)",
              color: "var(--sidebar-fg)",
            }}
          >
            {isAdmin ? "A" : "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-xs font-medium truncate"
              style={{ color: "var(--sidebar-fg)" }}
            >
              {isAdmin ? "Admin" : "User"}
            </div>
            <div
              className="text-xs truncate font-mono"
              style={{ color: "var(--sidebar-muted)" }}
            >
              {principalShort}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-xs h-8"
          style={{ color: "var(--sidebar-muted)" }}
        >
          <LogOut className="w-3 h-3 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col w-56 shrink-0"
        style={{ background: "var(--sidebar-bg)" }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSidebarOpen(false);
            }}
            role="button"
            tabIndex={-1}
            aria-label="Close sidebar"
          />
          <aside
            className="absolute left-0 top-0 bottom-0 w-56 flex flex-col"
            style={{ background: "var(--sidebar-bg)" }}
          >
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b bg-card">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-1"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm">RentIQ Udaipur</span>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>

        {/* Footer */}
        <footer className="border-t border-border bg-background py-2 px-4 shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-muted-foreground">
            <span>
              © {new Date().getFullYear()} RentIQ Udaipur — Equipment Rental
              Management
            </span>
            <span>
              Built with <span className="text-red-500">♥</span> using{" "}
              <a
                href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                caffeine.ai
              </a>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
