import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useDemo } from "@/context/DemoStore";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [{ title: "Settings — KHETSETU" }],
  }),
  component: AdminSettings,
});

function AdminSettings() {
  const { user, logout } = useDemo();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    void navigate({ to: "/login" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Account and system settings</p>
      </div>

      {/* Admin profile */}
      <Card className="p-8">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="text-lg font-semibold bg-purple-100 text-purple-600">
              {user.name?.charAt(0) || "A"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{user.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Administrator</p>
            <p className="mt-1 text-sm font-medium text-foreground">{user.email}</p>
          </div>
        </div>
      </Card>

      {/* Account info */}
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Account Information</h3>
        
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Email</p>
            <p className="mt-1 text-sm font-medium text-foreground">{user.email}</p>
          </div>

          {user.org && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Organization</p>
              <p className="mt-1 text-sm font-medium text-foreground">{user.org}</p>
            </div>
          )}

          {user.location && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Location</p>
              <p className="mt-1 text-sm font-medium text-foreground">{user.location}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-muted-foreground">Role</p>
            <p className="mt-1 text-sm font-medium text-foreground">Administrator</p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground">Account Type</p>
            <p className="mt-1 text-sm font-medium text-foreground">Admin (Demo)</p>
          </div>
        </div>
      </Card>

      {/* Preferences */}
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Preferences</h3>
        <p className="text-sm text-muted-foreground">Detailed preferences would be configured here in production</p>
      </Card>

      {/* Sign out */}
      <div className="flex gap-3">
        <Button onClick={handleLogout} variant="destructive" className="gap-2">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      {/* Demo info */}
      <Card className="border-blue-200 bg-blue-50/50 p-4">
        <p className="text-xs text-blue-700">
          <strong>Demo Account:</strong> This is a demo admin account. Changes made in this prototype are stored locally and will be cleared on page refresh.
        </p>
      </Card>
    </div>
  );
}
