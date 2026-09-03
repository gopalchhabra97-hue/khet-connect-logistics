import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LOCATIONS } from "@/data/mockData";
import { authApi } from "@/services/api";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register — KHETSETU demo" },
      {
        name: "description",
        content: "Role-specific registration forms for farmers/FPOs, buyers and drivers in the KHETSETU prototype.",
      },
      { property: "og:title", content: "Register — KHETSETU demo" },
      { property: "og:description", content: "Create a demo farmer, buyer or driver account on KHETSETU." },
    ],
  }),
  component: RegisterPage,
});

const base = {
  name: z.string().trim().min(2, "Enter at least 2 characters").max(80),
  phone: z.string().trim().regex(/^[0-9+\-\s]{10,15}$/, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(64),
};

const farmerSchema = z.object({
  ...base,
  village: z.string().trim().min(2, "Enter your village or city"),
  district: z.string().trim().min(2, "Enter your district"),
  state: z.string().trim().min(2, "Enter your state"),
  entity: z.string().min(1, "Select farmer or FPO"),
});

const buyerSchema = z.object({
  ...base,
  location: z.string().min(1, "Select a location"),
  buyerType: z.string().min(1, "Select a buyer type"),
});

const driverSchema = z.object({
  ...base,
  license: z.string().trim().min(6, "Enter a valid licence number"),
  vehicle: z.string().trim().min(4, "Enter vehicle details"),
});

type Errors = Record<string, string>;

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function useRegisterForm(
  schema: z.ZodTypeAny,
  role: "farmer" | "buyer" | "driver",
  roleLabel: string,
) {
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const result = schema.safeParse(data);
    if (!result.success) {
      const next: Errors = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      toast.error("Please fix the highlighted fields");
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      let org: string | undefined = undefined;
      let location: string | undefined = undefined;

      if (role === "farmer") {
        org = (data.entity as string) === "fpo" ? (data.name as string) : undefined;
        location = `${data.village}, ${data.district}, ${data.state}`;
      } else if (role === "buyer") {
        org = `${data.buyerType} Buyer`;
        location = data.location as string;
      } else if (role === "driver") {
        org = `Vehicle: ${data.vehicle}`;
        location = "Punjab Region";
      }

      await authApi.register({
        name: data.name as string,
        email: data.email as string,
        password: data.password as string,
        role,
        org,
        location,
      });

      setDone(true);
      toast.success(`${roleLabel} registration successful!`, {
        description: "Your account is saved in PostgreSQL. You can now sign in.",
      });
    } catch (err: any) {
      const msg = err.message || "Registration failed. Please try again.";
      const cleanMsg = msg.includes("]: ") ? msg.split("]: ")[1] : msg;
      if (cleanMsg.toLowerCase().includes("email already registered")) {
        setErrors({ email: "This email is already registered. Please login." });
      }
      toast.error("Registration failed", { description: cleanMsg });
    } finally {
      setIsLoading(false);
    }
  };

  return { errors, done, isLoading, submit, reset: () => setDone(false) };
}

function SuccessPanel({ roleLabel, onAgain }: { roleLabel: string; onAgain: () => void }) {
  return (
    <div className="rounded-xl border border-success/40 bg-success/8 p-6 text-center">
      <CheckCircle2 className="mx-auto mb-3 size-7 text-success" aria-hidden="true" />
      <p className="font-semibold text-foreground">{roleLabel} account created successfully</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Your account is saved. You can now sign in with your email and password.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link to="/login">Go to login</Link>
        </Button>
        <Button variant="outline" onClick={onAgain}>
          Register another
        </Button>
      </div>
    </div>
  );
}

function FarmerForm() {
  const { errors, done, isLoading, submit, reset } = useRegisterForm(farmerSchema, "farmer", "Farmer / FPO");
  if (done) return <SuccessPanel roleLabel="Farmer / FPO" onAgain={reset} />;
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field id="f-name" label="Name" error={errors["name"]}>
        <Input id="f-name" name="name" placeholder="Rajesh Kumar" />
      </Field>
      <Field id="f-phone" label="Phone" error={errors["phone"]}>
        <Input id="f-phone" name="phone" placeholder="+91 98765 43210" />
      </Field>
      <Field id="f-email" label="Email" error={errors["email"]}>
        <Input id="f-email" name="email" type="email" placeholder="you@example.com" />
      </Field>
      <Field id="f-password" label="Password" error={errors["password"]}>
        <Input id="f-password" name="password" type="password" />
      </Field>
      <Field id="f-village" label="Village / City" error={errors["village"]}>
        <Input id="f-village" name="village" placeholder="Patiala" />
      </Field>
      <Field id="f-district" label="District" error={errors["district"]}>
        <Input id="f-district" name="district" placeholder="Patiala" />
      </Field>
      <Field id="f-state" label="State" error={errors["state"]}>
        <Input id="f-state" name="state" placeholder="Punjab" />
      </Field>
      <Field id="f-entity" label="Registering as" error={errors["entity"]}>
        <Select name="entity" defaultValue="Farmer">
          <SelectTrigger id="f-entity" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Farmer">Individual farmer</SelectItem>
            <SelectItem value="FPO">Farmer Producer Organisation (FPO)</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Button type="submit" className="sm:col-span-2" disabled={isLoading}>
        {isLoading ? "Creating account…" : "Create farmer / FPO account"}
      </Button>
    </form>
  );
}

function BuyerForm() {
  const { errors, done, isLoading, submit, reset } = useRegisterForm(buyerSchema, "buyer", "Buyer");
  if (done) return <SuccessPanel roleLabel="Buyer" onAgain={reset} />;
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field id="b-name" label="Name / business name" error={errors["name"]}>
        <Input id="b-name" name="name" placeholder="FreshMart Retail" />
      </Field>
      <Field id="b-phone" label="Phone" error={errors["phone"]}>
        <Input id="b-phone" name="phone" placeholder="+91 98110 22334" />
      </Field>
      <Field id="b-email" label="Email" error={errors["email"]}>
        <Input id="b-email" name="email" type="email" placeholder="orders@example.com" />
      </Field>
      <Field id="b-password" label="Password" error={errors["password"]}>
        <Input id="b-password" name="password" type="password" />
      </Field>
      <Field id="b-location" label="Location" error={errors["location"]}>
        <Select name="location" defaultValue="Chandigarh">
          <SelectTrigger id="b-location" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCATIONS.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field id="b-type" label="Buyer type" error={errors["buyerType"]}>
        <Select name="buyerType" defaultValue="Retailer">
          <SelectTrigger id="b-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Retailer">Retailer</SelectItem>
            <SelectItem value="Wholesaler">Wholesaler / mandi</SelectItem>
            <SelectItem value="Processor">Food processor</SelectItem>
            <SelectItem value="Institution">Institutional buyer</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Button type="submit" className="sm:col-span-2" disabled={isLoading}>
        {isLoading ? "Creating account…" : "Create buyer account"}
      </Button>
    </form>
  );
}

function DriverForm() {
  const { errors, done, isLoading, submit, reset } = useRegisterForm(driverSchema, "driver", "Driver");
  if (done) return <SuccessPanel roleLabel="Driver" onAgain={reset} />;
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field id="d-name" label="Name" error={errors["name"]}>
        <Input id="d-name" name="name" placeholder="Amit Kumar" />
      </Field>
      <Field id="d-phone" label="Phone" error={errors["phone"]}>
        <Input id="d-phone" name="phone" placeholder="+91 99887 66554" />
      </Field>
      <Field id="d-email" label="Email" error={errors["email"]}>
        <Input id="d-email" name="email" type="email" placeholder="driver@example.com" />
      </Field>
      <Field id="d-password" label="Password" error={errors["password"]}>
        <Input id="d-password" name="password" type="password" />
      </Field>
      <Field id="d-license" label="Licence number" error={errors["license"]}>
        <Input id="d-license" name="license" placeholder="PB0320190004521" />
      </Field>
      <Field id="d-vehicle" label="Vehicle information" error={errors["vehicle"]}>
        <Input id="d-vehicle" name="vehicle" placeholder="HR-XX-1234 · 1,000 kg mini truck" />
      </Field>
      <Button type="submit" className="sm:col-span-2" disabled={isLoading}>
        {isLoading ? "Creating account…" : "Create driver account"}
      </Button>
    </form>
  );
}

function RegisterPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <Logo variant="mark" />
            <div>
              <p className="text-sm font-bold text-foreground">KHETSETU</p>
              <p className="text-[11px] text-muted-foreground">Connecting Supply, Demand &amp; Logistics</p>
            </div>
          </Link>
          <span className="ml-auto rounded-full border border-warning/50 bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning-foreground">
            DEMO MODE
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registration is simulated in this prototype. Nothing is stored on a server.
        </p>

        <div className="surface-panel mt-6 p-5 sm:p-6">
          <Tabs defaultValue="farmer">
            <TabsList className="mb-6 grid w-full grid-cols-3">
              <TabsTrigger value="farmer">Farmer / FPO</TabsTrigger>
              <TabsTrigger value="buyer">Buyer</TabsTrigger>
              <TabsTrigger value="driver">Driver</TabsTrigger>
            </TabsList>
            <TabsContent value="farmer">
              <FarmerForm />
            </TabsContent>
            <TabsContent value="buyer">
              <BuyerForm />
            </TabsContent>
            <TabsContent value="driver">
              <DriverForm />
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Already registered?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
