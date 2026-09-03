import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useDemo } from "@/context/DemoStore";
import type { Role } from "@/types";

export const Route = createFileRoute("/buyer")({
  beforeLoad: () => ({
    breadcrumb: "Buyer",
  }),
  component: BuyerLayout,
});

function BuyerLayout() {
  const { user, isAuthLoading } = useDemo();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthLoading && (!user || user.role !== "buyer")) {
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

  if (!user || user.role !== "buyer") {
    return null;
  }

  return (
    <AppShell role={user.role as Role} title="Buyer Dashboard">
      <Outlet />
    </AppShell>
  );
}
