import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Users,
  UserCheck,
  Package,
  Megaphone,
  BarChart3,
  LogOut,
  Building2,
  Menu,
  X,
  Sparkles,
  Cpu,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { formatRole } from "../utils/format";
import Badge from "./Badge";
import Button from "./Button";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { name: "Leads", path: "/app/leads", icon: Users },
    { name: "Customers", path: "/app/customers", icon: UserCheck },
    { name: "Product Matches", path: "/app/matches", icon: Sparkles },
    { name: "Products", path: "/app/products", icon: Package },
    { name: "Campaigns", path: "/app/campaigns", icon: Megaphone },
    { name: "Models", path: "/app/models", icon: Cpu },
  ];

  const disabledNavItems = [
    { name: "Outcomes", icon: BarChart3, badge: "Phase 5" },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between p-4 bg-canvas text-ink">
      <div>
        {/* Brand */}
        <div className="h-16 px-2 flex items-center justify-between border-b border-hairline mb-4">
          <NavLink to="/" className="flex items-center">
            <img
              src="/logo.png"
              alt="TARA"
              className="h-10 w-auto object-contain"
            />
          </NavLink>
          {mobileMenuOpen && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-1.5 rounded-md hover:bg-surface-strong text-muted"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5">
          <div className="px-3 py-1.5 t-label text-muted-soft">
            Audience & Catalog
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2 rounded-full t-nav transition-colors ${
                    isActive
                      ? "bg-surface-card text-ink border border-hairline shadow-soft"
                      : "text-body hover:text-ink hover:bg-canvas-soft"
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 text-muted" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}

          <div className="pt-6 px-3 py-1.5 t-label text-muted-soft">
            Voice Outreach
          </div>
          {disabledNavItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="flex items-center justify-between px-3.5 py-2 rounded-full t-nav text-muted-soft cursor-not-allowed select-none"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-muted-soft" />
                  <span>{item.name}</span>
                </div>
                <span className="t-label px-2 py-0.5 rounded-full bg-surface-strong text-muted-soft border border-hairline">
                  {item.badge}
                </span>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="px-3 py-3 border-t border-hairline t-caption text-muted flex items-center justify-between">
        <span>Bolna Buildathon</span>
        <span className="t-caption text-muted-soft">v1.6</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-canvas text-ink font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 bg-canvas border-r border-hairline flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-ink/30 backdrop-blur-sm flex">
          <div className="w-64 bg-canvas h-full border-r border-hairline shadow-xl">
            {sidebarContent}
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-surface-card border-b border-hairline px-4 md:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-md hover:bg-surface-strong text-ink"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-strong border border-hairline t-caption text-body-strong">
              <Building2 className="w-3.5 h-3.5 text-muted" />
              <span>{user?.tenant_name || "Workspace"}</span>
            </div>
          </div>

          {/* User profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 t-caption">
              <span className="t-body-strong text-ink">{user?.name}</span>
              <Badge variant={user?.role === "SUPER_ADMIN" ? "purple" : "default"}>
                {formatRole(user?.role)}
              </Badge>
            </div>

            <div className="h-4 w-[1px] bg-hairline hidden sm:block" />

            <Button
              id="logout-btn"
              variant="outline"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="w-3.5 h-3.5 text-muted" />
              <span>Sign out</span>
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
