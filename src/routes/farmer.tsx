import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useDemo } from "@/context/DemoStore";
import type { Role } from "@/types";

export const Route = createFileRoute("/farmer")({
  beforeLoad: () => ({
    breadcrumb: "Farmer",
  }),
  component: FarmerLayout,
});

function FarmerLayout() {
  const { user } = useDemo();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== "farmer") {
      void navigate({ to: "/login" });
    }
  }, [user, navigate]);

  if (!user || user.role !== "farmer") {
    return null;
  }

  return (
    <AppShell role={user.role as Role} title="Farmer Dashboard">
      <Outlet />
    </AppShell>
  );
}
