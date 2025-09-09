import { cn } from "@/lib/utils";

export function gridCardClasses(extra?: string) {
  return cn(
    "bg-card rounded-none border border-[hsl(var(--border-subtle))]",
    "hover:border-white hover:ring-1 hover:ring-white/70",
    // Use a named group to isolate hover states to each card only
    "transition-colors duration-200 overflow-hidden cursor-pointer group/card",
    extra
  );
}
