"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // Layout
      "flex h-10 w-full items-center justify-start gap-2 overflow-visible",
      // Simpler, cleaner surface (no mid-gray background)
      "bg-transparent p-0",
      // Subtle separation from content
      "border-b border-[hsl(var(--border))]",
      "text-[hsl(var(--muted-foreground))]",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Base
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium",
      "transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 select-none touch-manipulation cursor-pointer",
      // Default/inactive appearance
      "text-[hsl(var(--muted-foreground))] border border-transparent",
      // Hover state (requested)
      "hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))/8] hover:border-[hsl(var(--border))]",
      // Active state: outlined tab (no underline)
      "data-[state=active]:text-[hsl(var(--foreground))] data-[state=active]:bg-[hsl(var(--background))]",
      "data-[state=active]:border data-[state=active]:border-[hsl(var(--primary))] data-[state=active]:shadow-sm",
      // Tap feedback
      "active:scale-[0.98] transition-transform duration-100",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 ring-offset-[hsl(var(--background))] focus-visible:outline-none",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
