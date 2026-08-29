import logo from "@/assets/khetsetu-logo.jpg.asset.json";
import { cn } from "@/lib/utils";

export const LOGO_URL = logo.url;

export function Logo({
  className,
  variant = "full",
}: {
  className?: string;
  variant?: "full" | "mark";
}) {
  if (variant === "mark") {
    return (
      <span
        className={cn(
          "inline-block size-10 shrink-0 overflow-hidden rounded-lg bg-[#0b0f14]",
          className,
        )}
      >
        <img
          src={logo.url}
          alt="KHETSETU logo — a farmer with a tablet in a leaf emblem"
          className="h-full w-[280%] max-w-none -translate-x-[9%] object-cover"
        />
      </span>
    );
  }
  return (
    <img
      src={logo.url}
      alt="KHETSETU — Connecting Supply, Demand & Logistics. Powered by CodeAxis"
      className={cn("rounded-xl object-contain", className)}
    />
  );
}
