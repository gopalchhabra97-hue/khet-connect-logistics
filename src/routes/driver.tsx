import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useDemo } from "@/context/DemoStore";
import type { Role } from "@/types";

export const Route = createFileRoute("/driver")({
  beforeLoad: () => ({
    breadcrumb: "Driver",
  }),
  component: DriverLayout,
});

function DriverLayout() {
  const { user } = useDemo();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== "driver") {
      void navigate({ to: "/login" });
    }
  }, [user, navigate]);

  if (!user || user.role !== "driver") {
    return null;
  }

  return (
    <AppShell role={user.role as Role} title="Driver Dashboard">
      <Outlet />
    </AppShell>
  );
}
