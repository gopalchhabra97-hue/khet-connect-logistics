import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Boxes,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LineChart,
  LogOut,
  Map,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingBasket,
  Store,
  Truck,
  User as UserIcon,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Logo } from "@/components/brand/Logo";
import { NotificationPanel } from "@/components/layout/NotificationPanel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useDemo } from "@/context/DemoStore";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export const NAV: Record<Role, NavItem[]> = {
  farmer: [
    { label: "Dashboard", to: "/farmer", icon: LayoutDashboard },
    { label: "My Products", to: "/farmer/products", icon: Package },
    { label: "Orders", to: "/farmer/orders", icon: ClipboardList },
    { label: "Demand Forecast", to: "/farmer/forecast", icon: LineChart },
    { label: "Deliveries", to: "/farmer/deliveries", icon: Truck },
    { label: "Profile", to: "/farmer/profile", icon: UserIcon },
  ],
  buyer: [
    { label: "Dashboard", to: "/buyer", icon: LayoutDashboard },
    { label: "Marketplace", to: "/buyer/marketplace", icon: Store },
    { label: "My Orders", to: "/buyer/orders", icon: ShoppingBasket },
    { label: "Order Tracking", to: "/buyer/tracking", icon: Map },
    { label: "Profile", to: "/buyer/profile", icon: UserIcon },
  ],
  driver: [
    { label: "Dashboard", to: "/driver", icon: LayoutDashboard },
    { label: "Assigned Deliveries", to: "/driver/deliveries", icon: Truck },
    { label: "Route", to: "/driver/route", icon: Map },
    { label: "Delivery History", to: "/driver/history", icon: ClipboardList },
    { label: "Profile", to: "/driver/profile", icon: UserIcon },
  ],
  admin: [
    { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
    { label: "Farmers/FPOs", to: "/admin/farmers", icon: Users },
    { label: "Buyers", to: "/admin/buyers", icon: Store },
    { label: "Products", to: "/admin/products", icon: Package },
    { label: "Orders", to: "/admin/orders", icon: ClipboardList },
    { label: "Logistics", to: "/admin/logistics", icon: Boxes },
    { label: "Vehicles & Drivers", to: "/admin/fleet", icon: Warehouse },
    { label: "Demand Analytics", to: "/admin/analytics", icon: BarChart3 },
    { label: "Settings", to: "/admin/settings", icon: Settings },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  farmer: "Farmer / FPO",
  buyer: "Buyer",
  driver: "Driver",
  admin: "Admin",
};

function NavList({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1 px-3" aria-label="Main navigation">
      {NAV[role].map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-4.5 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarInner({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-4 py-4">
        <Logo variant="mark" />
        <div>
          <p className="text-sm font-semibold tracking-wide text-sidebar-foreground">KHETSETU</p>
          <p className="text-[11px] text-sidebar-foreground/70">
            Connecting Supply, Demand &amp; Logistics
          </p>
        </div>
      </div>
      <div className="mx-4 mb-3 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-3 py-2">
        <p className="text-[11px] text-sidebar-foreground/70">Signed in as</p>
        <p className="text-sm font-medium">{ROLE_LABEL[role]}</p>
      </div>
      <div className="flex-1 overflow-y-auto pb-4">
        <NavList role={role} onNavigate={onNavigate} />
      </div>
      <div className="border-t border-sidebar-border px-4 py-3 text-[11px] text-sidebar-foreground/70">
        <p>SIH 2026 • SIH26033</p>
        <p>Technology partner: CodeAxis</p>
      </div>
    </div>
  );
}

export function AppShell({
  role,
  title,
  breadcrumb,
  searchPlaceholder,
  onSearch,
  actions,
  children,
}: {
  role: Role;
  title: string;
  breadcrumb?: string[];
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { user, logout } = useDemo();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">
        <SidebarInner role={role} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11 lg:hidden"
                  aria-label="Open navigation menu"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-0 p-0">
                <SheetTitle className="sr-only">KHETSETU navigation</SheetTitle>
                <SidebarInner role={role} onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              {breadcrumb && breadcrumb.length > 0 ? (
                <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
                  {breadcrumb.map((crumb, i) => (
                    <span key={crumb} className="flex items-center gap-1">
                      {i > 0 ? <ChevronRight className="size-3" aria-hidden="true" /> : null}
                      {crumb}
                    </span>
                  ))}
                </nav>
              ) : null}
              <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">{title}</h1>
            </div>

            {onSearch ? (
              <div className="relative hidden md:block">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  aria-label="Search"
                  placeholder={searchPlaceholder ?? "Search"}
                  className="w-56 pl-9"
                  onChange={(e) => onSearch(e.target.value)}
                />
              </div>
            ) : null}

            <span className="hidden items-center gap-1.5 rounded-full border border-warning/50 bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning-foreground sm:inline-flex">
              DEMO MODE
            </span>
            <span className="hidden rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary md:inline-flex">
              {ROLE_LABEL[role]}
            </span>

            {actions}
            <NotificationPanel role={role} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label="Open profile menu">
                  <span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {(ready && user?.name ? user.name : ROLE_LABEL[role]).charAt(0)}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium">{ready ? (user?.name ?? "Demo user") : "Demo user"}</p>
                  <p className="text-xs font-normal text-muted-foreground">
                    {ready ? (user?.email ?? `${role}@demo.com`) : `${role}@demo.com`}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={`/${role}/profile`}>
                    <UserIcon className="mr-2 size-4" /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    void navigate({ to: "/login" });
                  }}
                >
                  <LogOut className="mr-2 size-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="border-t border-border px-4 py-1.5 sm:hidden">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/50 bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning-foreground">
              DEMO MODE · {ROLE_LABEL[role]}
            </span>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
