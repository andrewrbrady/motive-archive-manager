"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const tabParam = searchParams.get(paramName);

  // Use the URL parameter if available, otherwise use the defaultValue or the first tab
  const initialTab = tabParam || defaultValue || items[0]?.value;
  const [activeTab, setActiveTab] = useState(initialTab);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);

    // Create a new URLSearchParams object from the current search params
    const params = new URLSearchParams(searchParams);

    // Update the tab parameter
    params.set(paramName, value);

    // Preserve all other parameters
    router.push(`${basePath}?${params.toString()}`, { scroll: false });
  };

  // Sync with URL parameters on initial load and when URL changes
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  return (
    <Tabs
      defaultValue={initialTab}
      value={activeTab}
      onValueChange={handleTabChange}
      className={`w-full ${className}`}
    >
      <TabsList className="mb-8 h-10 items-center justify-start p-1 text-[hsl(var(--muted-foreground))] w-full gap-1 overflow-visible bg-transparent">
        {items.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium relative transition-all duration-300 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border border-transparent data-[state=active]:bg-transparent data-[state=active]:text-[hsl(var(--foreground))] data-[state=active]:border-[hsl(var(--border))] data-[state=active]:shadow-sm data-[state=inactive]:text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))/10] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--border))]/50 hover:-translate-y-0.5 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[hsl(var(--primary))] after:scale-x-0 after:origin-center after:transition-transform after:duration-300 hover:after:scale-x-100 data-[state=active]:after:scale-x-100"
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
