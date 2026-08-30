import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LogOut, Mail, Phone, MapPin, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/context/DemoStore";

export const Route = createFileRoute("/farmer/profile")({
  head: () => ({
    meta: [
      { title: "Profile — KHETSETU" },
    ],
  }),
  component: FarmerProfile,
});

function FarmerProfile() {
  const navigate = useNavigate();
  const { user, logout } = useDemo();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    void navigate({ to: "/login" });
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate({ to: "/farmer" })}>
        <ArrowLeft className="mr-2 size-4" />
        Back to Dashboard
      </Button>

      <div className="mx-auto max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Profile</h1>
          <p className="mt-1 text-muted-foreground">
            Your account information and settings
          </p>
        </div>

        {/* Profile Card */}
        <div className="surface-panel mt-6 p-6">
          <div className="mb-6 border-b border-border pb-6">
            <div className="flex items-center gap-4">
              <div className="grid size-16 place-items-center rounded-lg bg-primary/10 text-2xl font-bold text-primary">
                {user.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{user.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Farmer / FPO</p>
              </div>
            </div>
          </div>

          {/* Information Grid */}
          <div className="space-y-4">
            <div className="flex items-start gap-4 rounded-lg border border-border p-4">
              <Mail className="mt-1 size-5 text-muted-foreground" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Email</p>
                <p className="font-medium text-foreground">{user.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-lg border border-border p-4">
              <Building className="mt-1 size-5 text-muted-foreground" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Organization</p>
                <p className="font-medium text-foreground">{user.org || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-lg border border-border p-4">
              <MapPin className="mt-1 size-5 text-muted-foreground" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Location</p>
                <p className="font-medium text-foreground">{user.location || "—"}</p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 rounded-lg border border-info/50 bg-info/15 p-4">
            <p className="text-sm text-info-foreground">
              <span className="font-semibold">📝 Note:</span> In this prototype, profile editing is
              not yet implemented. Production systems would include fields for phone number,
              banking details, and additional certification information.
            </p>
          </div>

          {/* Logout Button */}
          <div className="mt-8 border-t border-border pt-6">
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full gap-2 sm:w-auto"
            >
              <LogOut className="size-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
