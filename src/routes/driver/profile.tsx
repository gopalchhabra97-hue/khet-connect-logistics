import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Mail, Phone, FileCheck, MapPin, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useDemo } from "@/context/DemoStore";

export const Route = createFileRoute("/driver/profile")({
  head: () => ({
    meta: [{ title: "Profile — KHETSETU" }],
  }),
  component: DriverProfile,
});

function DriverProfile() {
  const { user, drivers, logout } = useDemo();
  const navigate = useNavigate();

  if (!user) return null;

  const driverInfo = drivers.find((d) => d.id === user.id);

  const handleLogout = () => {
    logout();
    void navigate({ to: "/login" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Driver account settings</p>
      </div>

      {/* Profile card */}
      <Card className="p-8">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="text-lg font-semibold bg-blue-100 text-blue-600">
              {user.name?.charAt(0) || "D"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{user.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Driver</p>
            <div className="mt-3 flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 w-fit">
              ● {driverInfo?.status === "Available" ? "Available" : "Assigned"}
            </div>
          </div>
        </div>
      </Card>

      {/* Information */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact info */}
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-foreground">Contact Information</h3>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-foreground">{user.email}</p>
              </div>
            </div>

            {driverInfo && (
              <>
                <div className="flex items-center gap-4">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium text-foreground">{driverInfo.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <FileCheck className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">License Number</p>
                    <p className="text-sm font-medium text-foreground font-mono">{driverInfo.license}</p>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center gap-4">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Base Location</p>
                <p className="text-sm font-medium text-foreground">{user.location}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Status info */}
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-foreground">Status</h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Availability</p>
              <div className="mt-2 flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${driverInfo?.status === "Available" ? "bg-green-500" : "bg-blue-500"}`} />
                <p className="text-sm font-medium text-foreground">
                  {driverInfo?.status === "Available" ? "Available" : "Assigned"}
                </p>
              </div>
            </div>

            {driverInfo?.vehicleId && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Assigned Vehicle</p>
                <p className="mt-1 text-sm font-medium text-foreground">Yes</p>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground">Account Type</p>
              <p className="mt-1 text-sm font-medium text-foreground">Driver (Demo)</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Logout */}
      <div className="flex gap-3">
        <Button onClick={handleLogout} variant="destructive" className="gap-2">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      {/* Demo info */}
      <Card className="border-blue-200 bg-blue-50/50 p-4">
        <p className="text-xs text-blue-700">
          <strong>Demo Account:</strong> This is a demo driver account. Changes made in this prototype are stored locally and will be cleared on page refresh.
        </p>
      </Card>
    </div>
  );
}
