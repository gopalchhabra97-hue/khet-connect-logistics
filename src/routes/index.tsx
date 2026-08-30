import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Handshake,
  LineChart,
  MapPin,
  Route as RouteIcon,
  ShoppingBasket,
  Sprout,
  Store,
  Truck,
  Users,
} from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { ForecastFlow } from "@/components/common/ForecastFlow";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KHETSETU — Connect Farmers. Understand Demand. Deliver Smarter." },
      {
        name: "description",
        content:
          "KHETSETU is an SIH 2026 prototype connecting farmers and FPOs with buyers, with demand forecasting and coordinated agricultural logistics.",
      },
      { property: "og:title", content: "KHETSETU — Connect Farmers. Understand Demand. Deliver Smarter." },
      {
        property: "og:description",
        content:
          "Digital marketplace, demand intelligence and smart logistics prototype for problem statement SIH26033.",
      },
    ],
  }),
  component: Landing,
});

const FLOW = [
  { label: "Farmer / FPO", icon: Sprout },
  { label: "Marketplace", icon: Store },
  { label: "Buyer", icon: ShoppingBasket },
  { label: "Smart Logistics", icon: Boxes },
  { label: "Delivery", icon: Truck },
];

const STEPS = [
  { label: "List Produce", icon: Sprout },
  { label: "Buyer Orders", icon: ShoppingBasket },
  { label: "Farmer Accepts", icon: ClipboardCheck },
  { label: "Group Orders", icon: Boxes },
  { label: "Match Vehicle", icon: Truck },
  { label: "Plan Route", icon: RouteIcon },
  { label: "Deliver", icon: MapPin },
];

const SOLUTIONS = [
  { title: "Digital marketplace", body: "Farmers and FPOs publish produce listings that buyers can browse directly.", icon: Store },
  { title: "Direct buyer access", body: "Bulk buyers and retailers reach producers without a chain of intermediaries.", icon: Handshake },
  { title: "Product listings", body: "Crop, quantity, price, location, harvest date and availability in one record.", icon: Sprout },
  { title: "Order management", body: "Farmers review, accept or reject each order before any logistics planning starts.", icon: ClipboardCheck },
  { title: "Demand forecasting", body: "Historical order patterns are used in a demo forecast to support supply planning.", icon: LineChart },
  { title: "Compatible order grouping", body: "Accepted orders with nearby pickup and compatible drops can be consolidated.", icon: Boxes },
  { title: "Vehicle & driver matching", body: "Transparent, rule-based matching on capacity, availability and proximity.", icon: Truck },
  { title: "Route planning", body: "A demo multi-stop route with distance, time and load summary.", icon: RouteIcon },
  { title: "Delivery visibility", body: "Buyers, farmers and admins follow the same delivery status timeline.", icon: Eye },
];

const BENEFITS = [
  { title: "Better market access", body: "More producers can reach buyers beyond their local mandi." },
  { title: "Better supply planning", body: "Forecast signals help plan what to grow, harvest and list." },
  { title: "Coordinated logistics", body: "Compatible orders can move together instead of separately." },
  { title: "Improved transparency", body: "Prices, quantities and delivery status are visible to both sides." },
  { title: "Potential reduction in unnecessary transportation", body: "Consolidation aims to reduce duplicate trips on the same corridor." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Logo variant="mark" />
          <div className="mr-auto">
            <p className="text-sm font-bold tracking-wide text-foreground">KHETSETU</p>
            <p className="hidden text-[11px] text-muted-foreground sm:block">
              Connecting Supply, Demand &amp; Logistics
            </p>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex" aria-label="Landing sections">
            <a href="#problem" className="hover:text-foreground">Problem</a>
            <a href="#solution" className="hover:text-foreground">Solution</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#forecast" className="hover:text-foreground">Demand intelligence</a>
          </nav>
          <Button asChild variant="outline" className="hidden sm:inline-flex">
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link to="/buyer/marketplace">Explore Marketplace</Link>
          </Button>
        </div>
      </header>

      <section className="grid-field border-b border-border">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Smart India Hackathon 2026 • SIH26033
            </span>
            <h1 className="mt-5 text-4xl leading-tight font-extrabold tracking-tight text-foreground sm:text-5xl">
              Connect Farmers. Understand Demand. Deliver Smarter.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              KHETSETU connects farmers and FPOs directly with consumers and bulk buyers while
              coordinating intelligent agricultural logistics.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/buyer/marketplace">
                  Explore Marketplace <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#how">How It Works</a>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Frontend prototype with mock data. Organization: <strong className="text-foreground">CodeAxis</strong>.
            </p>
          </div>

          <div className="space-y-4">
            <div className="surface-panel overflow-hidden bg-[#0b0f14] p-0">
              <Logo className="h-auto w-full" />
            </div>
            <div className="surface-panel p-5">
              <p className="mb-4 text-sm font-semibold text-foreground">End-to-end flow</p>
              <ol className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                {FLOW.map((step, i) => (
                  <li key={step.label} className="flex items-center gap-2 sm:flex-col sm:text-center">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <step.icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-xs font-medium text-foreground">{step.label}</span>
                    {i < FLOW.length - 1 ? (
                      <ArrowRight className="size-4 rotate-90 text-muted-foreground sm:hidden" aria-hidden="true" />
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section id="problem" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">The problem</p>
        <h2 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-foreground">
          Multiple Intermediaries Reduce Farmers Earnings And Increase Consumer Prices
        </h2>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Produce often passes through several intermediaries between the field and the buyer. Each
          additional handover can reduce the farmer&apos;s share of the final price, limit market
          access for small producers, and add cost that is eventually reflected in consumer prices.
          Fragmented transport adds further cost, since small consignments travelling separately on
          the same corridor are more expensive to move than a consolidated load.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { t: "Limited market access", d: "Small farmers and FPOs often depend on a narrow set of local buyers." },
            { t: "Weak demand signals", d: "Planting and harvest planning happens with little visibility of future demand." },
            { t: "Fragmented transport", d: "Separate small consignments raise logistics cost per kilogram." },
          ].map((item) => (
            <div key={item.t} className="surface-panel p-5">
              <h3 className="font-semibold text-foreground">{item.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="solution" className="border-y border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">Our solution</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            One platform for supply, demand and logistics
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SOLUTIONS.map((s) => (
              <div key={s.title} className="surface-panel p-5">
                <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="size-4.5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">How it works</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
          From listing to consolidated delivery
        </h2>
        <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {STEPS.map((s, i) => (
            <li key={s.label} className="surface-panel flex items-center gap-3 p-4 lg:flex-col lg:text-center">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-leaf/25 text-primary">
                <s.icon className="size-4.5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Step {i + 1}</p>
                <p className="text-sm font-medium text-foreground">{s.label}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="forecast" className="border-y border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">AI demand intelligence</p>
          <h2 className="mt-2 mb-6 text-3xl font-bold tracking-tight text-foreground">
            Historical orders can inform future supply planning
          </h2>
          <ForecastFlow />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">Benefits</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Intended outcomes</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          These are design intentions for the prototype, not guaranteed results.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="surface-panel flex gap-3 p-5">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-foreground">{b.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{b.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Enter the Marketplace</h2>
            <p className="mt-2 max-w-xl text-primary-foreground/85">
              Browse demo listings from Patiala, Ludhiana, Karnal and Kurukshetra, place an order and
              follow it through grouping, matching, routing and delivery.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/buyer/marketplace">Explore Marketplace</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link to="/login">Login to demo</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Logo variant="mark" />
            <div>
              <p className="text-sm font-semibold text-foreground">KHETSETU</p>
              <p className="text-xs text-muted-foreground">Connecting Supply, Demand &amp; Logistics</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <Users className="size-3.5" aria-hidden="true" /> Built by CodeAxis for Smart India Hackathon 2026
            </p>
            <p className="mt-1 flex items-center gap-1.5">
              <BarChart3 className="size-3.5" aria-hidden="true" /> Problem statement SIH26033 · Agriculture, FoodTech &amp; Rural Development
            </p>
            <p className="mt-1">Frontend prototype with mock data — no production backend or live tracking.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
