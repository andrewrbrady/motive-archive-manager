"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cleanupUrlParameters } from "@/utils/urlCleanup";

export interface TabItem {
  value: string;
  label: string;
  content: React.ReactNode;
}

interface CustomTabsProps {
  items: TabItem[];
  defaultValue?: string;
  paramName?: string;
  basePath: string;
  className?: string;
}

export function CustomTabs({
  items,
  defaultValue,
  paramName = "tab",
  basePath,
  className = "",
}: CustomTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get(paramName);

  // Simplified refs - only track URL updates to prevent loops
  const urlUpdateTimeoutRef = useRef<NodeJS.Timeout>();
  const lastUrlUpdateRef = useRef<string>("");

  // Use the URL parameter if available, otherwise use the defaultValue or the first tab
  const initialTab = tabParam || defaultValue || items[0]?.value;
  const [activeTab, setActiveTab] = useState(initialTab);

  // Simplified URL update function with shorter debounce
  const updateUrl = useCallback(
    (value: string) => {
      // Skip if we just updated to this value
      if (lastUrlUpdateRef.current === value) return;

      // Clear any pending URL updates
      if (urlUpdateTimeoutRef.current) {
        clearTimeout(urlUpdateTimeoutRef.current);
      }

      // Shorter debounce for more responsive feel
      urlUpdateTimeoutRef.current = setTimeout(() => {
        try {
          lastUrlUpdateRef.current = value;

          // Create a new URLSearchParams object from the current search params
          const params = new URLSearchParams(searchParams?.toString() || "");

          // Check for template parameter when switching to non-template tabs
          const hasTemplateParam = params.has("template");
          const isTemplateTab = value === "shot-lists" || value === "scripts";

          // Update the tab parameter
          params.set(paramName, value);

          // When switching to a non-template tab, explicitly remove template parameter
          if (hasTemplateParam && !isTemplateTab) {
            params.delete("template");
          }

          // Apply context-based cleanup to the parameters
          const context = `tab:${value}`;
          const cleanedParams = cleanupUrlParameters(params, context);

          // Use the cleaned parameters
          router.push(`${basePath}?${cleanedParams.toString()}`, {
            scroll: false,
          });
        } catch (error) {
          console.error("Error updating URL:", error);
        }
      }, 50); // Reduced from 150ms to 50ms for more responsive feel
    },
    [searchParams, paramName, basePath, router]
  );

  // Simplified tab change handler with immediate UI response
  const handleTabChange = useCallback(
    (value: string) => {
      // Immediately update component state for instant UI feedback
      setActiveTab(value);

      // Update URL with minimal debouncing
      updateUrl(value);
    },
    [updateUrl]
  );

  // Sync with URL parameters but only when URL actually changes
  useEffect(() => {
    if (
      tabParam &&
      tabParam !== activeTab &&
      tabParam !== lastUrlUpdateRef.current
    ) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (urlUpdateTimeoutRef.current) {
        clearTimeout(urlUpdateTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Tabs
      defaultValue={initialTab}
      value={activeTab}
      onValueChange={handleTabChange}
      className={`w-full ${className}`}
    >
      <TabsList className="mb-8 h-auto min-h-[2.5rem] items-center justify-start p-1 text-[hsl(var(--muted-foreground))] w-full gap-2 overflow-visible bg-transparent flex flex-wrap">
        {items.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium relative transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border border-transparent data-[state=active]:bg-transparent data-[state=active]:text-[hsl(var(--foreground))] data-[state=active]:border-[hsl(var(--border))] data-[state=active]:shadow-sm data-[state=inactive]:text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))/10] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--border))]/50 hover:-translate-y-0.5 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[hsl(var(--primary))] after:scale-x-0 after:origin-center after:transition-transform after:duration-200 hover:after:scale-x-100 data-[state=active]:after:scale-x-100 mb-1"
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {items.map((item) => (
        <TabsContent key={item.value} value={item.value}>
          {item.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
