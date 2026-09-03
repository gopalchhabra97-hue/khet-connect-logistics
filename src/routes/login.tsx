import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDemo } from "@/context/DemoStore";
import type { Role } from "@/types";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — KHETSETU demo" },
      {
        name: "description",
        content: "Sign in to the KHETSETU prototype as a farmer/FPO, buyer, driver or admin using demo accounts.",
      },
      { property: "og:title", content: "Login — KHETSETU demo" },
      { property: "og:description", content: "Role-based mock login for the KHETSETU SIH 2026 prototype." },
    ],
  }),
  component: LoginPage,
});

const DEMO_ACCOUNTS: { role: Role; email: string; label: string }[] = [
  { role: "farmer", email: "farmer@demo.com", label: "Farmer / FPO" },
  { role: "buyer", email: "buyer@demo.com", label: "Buyer" },
  { role: "driver", email: "driver@demo.com", label: "Driver" },
  { role: "admin", email: "admin@demo.com", label: "Admin" },
];

const HOME: Record<Role, string> = {
  farmer: "/farmer",
  buyer: "/buyer",
  driver: "/driver",
  admin: "/admin",
};

function LoginPage() {
  const { login } = useDemo();
  const navigate = useNavigate();
  const [email, setEmail] = useState("farmer@demo.com");
  const [password, setPassword] = useState("demo123");
  const [role, setRole] = useState<Role>("farmer");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signIn = async (targetEmail: string, targetPassword?: string, targetRole?: Role) => {
    if (!targetEmail.trim()) {
      setError("Enter an email or mobile number to continue.");
      return;
    }
    setError(null);
    setBusy(true);

    try {
      const user = await login(targetEmail, targetPassword || password, targetRole || role);
      const userRole = (user.role as Role) || targetRole || role;
      toast.success("Signed in successfully", {
        description: `Welcome back, ${user.name || user.email}! Continuing to ${userRole} dashboard.`,
      });
      void navigate({ to: HOME[userRole] || "/farmer" });
    } catch (err: any) {
      const msg = err.message || "Failed to sign in. Please check your credentials.";
      const cleanMsg = msg.includes("]: ") ? msg.split("]: ")[1] : msg;
      setError(cleanMsg);
      toast.error("Authentication failed", { description: cleanMsg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <Link to="/" className="inline-block">
          <Logo className="w-full max-w-md" />
        </Link>
        <div>
          <h2 className="text-2xl font-semibold">Connect Farmers. Understand Demand. Deliver Smarter.</h2>
          <p className="mt-3 max-w-md text-sidebar-foreground/75">
            A Smart India Hackathon 2026 prototype for problem statement SIH26033, built by CodeAxis.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/60">
          Frontend prototype. Mock authentication only — production security is not implemented.
        </p>
      </div>

      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <Logo variant="mark" />
            <div>
              <p className="font-bold text-foreground">KHETSETU</p>
              <p className="text-xs text-muted-foreground">Connecting Supply, Demand &amp; Logistics</p>
            </div>
          </div>

          <span className="inline-flex rounded-full border border-warning/50 bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning-foreground">
            DEMO MODE
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a role and continue to the matching dashboard.
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void signIn(email, password, role);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Email or mobile</Label>
              <Input
                id="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="farmer@demo.com"
                autoComplete="username"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password">Password</Label>
                <Dialog>
                  <DialogTrigger asChild>
                    <button type="button" className="text-xs font-medium text-primary hover:underline">
                      Forgot password?
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reset password</DialogTitle>
                      <DialogDescription>
                        In this prototype no email is sent. In a production build this would trigger a
                        secure reset link through the authentication provider.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-1.5">
                      <Label htmlFor="reset-email">Registered email</Label>
                      <Input id="reset-email" placeholder="you@example.com" />
                    </div>
                    <Button
                      type="button"
                      onClick={() => toast.success("Demo reset link generated")}
                    >
                      Send reset link
                    </Button>
                  </DialogContent>
                </Dialog>
              </div>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger id="login-role" className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {DEMO_ACCOUNTS.map((a) => (
                    <SelectItem key={a.role} value={a.role}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error ? (
              <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Signing in…" : "Login"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={() => void signIn(`${role}@demo.com`, "demo123", role)}
            >
              Continue with demo account
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-border bg-surface p-4">
            <p className="text-sm font-semibold text-foreground">Demo credentials</p>
            <p className="text-xs text-muted-foreground">Default demo password: demo123</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.email}>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(a.email);
                      setPassword("demo123");
                      setRole(a.role);
                    }}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-left text-xs hover:border-primary/50"
                  >
                    <span className="block font-medium text-foreground">{a.label}</span>
                    <span className="text-muted-foreground">{a.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            New to KHETSETU?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
