import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useDemo } from "@/context/DemoStore";
import type { Role } from "@/types";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => ({
    breadcrumb: "Admin",
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const { user, isAuthLoading } = useDemo();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthLoading && (!user || user.role !== "admin")) {
      void navigate({ to: "/login" });
    }
  }, [user, isAuthLoading, navigate]);

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">Verifying credentials…</p>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <AppShell role={user.role as Role} title="Admin Dashboard">
      <Outlet />
    </AppShell>
  );
}
