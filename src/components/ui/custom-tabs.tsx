"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cleanupUrlParameters } from "@/utils/urlCleanup";
import {
  ImageIcon,
  FolderIcon,
  Settings,
  Camera,
  FileText,
  Edit,
  ExternalLink,
  Share2,
  ClipboardCheck,
  FileIcon,
  Newspaper,
  Package,
  CalendarDays,
  Calendar,
} from "lucide-react";

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

// Function to get the appropriate icon for each tab
const getTabIcon = (tabValue: string) => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    gallery: ImageIcon,
    "car-galleries": FolderIcon,
    specs: Settings,
    shoots: Camera,
    "shot-lists": FileText,
    scripts: Edit,
    bat: ExternalLink,
    captions: Share2,
    inspections: ClipboardCheck,
    documentation: FileIcon,
    deliverables: Package,
    events: CalendarDays,
    calendar: Calendar,
    production: Settings,
  };

  return iconMap[tabValue] || FileIcon;
};

// Hook to detect mobile screen size
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  return isMobile;
};

export function CustomTabs({
  items,
  defaultValue,
  paramName = "tab",
  basePath,
  className = "",
}: CustomTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();

  // Get current tab from URL or use default
  const urlTab = searchParams?.get(paramName) || null;
  const validTab = items.find((item) => item.value === urlTab);
  const currentTab = validTab ? urlTab! : defaultValue || items[0]?.value;

  // Use a ref to prevent unnecessary re-renders and race conditions
  const isUpdatingUrl = useRef(false);

  // Simplified tab change handler
  const handleTabChange = useCallback(
    (value: string) => {
      // Prevent multiple rapid clicks
      if (isUpdatingUrl.current) return;

      isUpdatingUrl.current = true;

      try {
        // Create new URL params
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

        // Navigate immediately
        router.replace(`${basePath}?${cleanedParams.toString()}`, {
          scroll: false,
        });
      } catch (error) {
        console.error("Error updating URL:", error);
      } finally {
        // Reset the flag after a short delay
        setTimeout(() => {
          isUpdatingUrl.current = false;
        }, 100);
      }
    },
    [searchParams, paramName, basePath, router]
  );

  // Get the current tab label for the dropdown
  const currentTabLabel =
    items.find((item) => item.value === currentTab)?.label || items[0]?.label;

  return (
    <Tabs
      value={currentTab}
      onValueChange={handleTabChange}
      className={`w-full ${className}`}
    >
      {/* Mobile Dropdown */}
      {isMobile ? (
        <div className="mb-8">
          <Select value={currentTab} onValueChange={handleTabChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a tab">
                <div className="flex items-center gap-2">
                  {(() => {
                    const IconComponent = getTabIcon(currentTab);
                    return <IconComponent className="h-4 w-4" />;
                  })()}
                  {currentTabLabel}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => {
                const IconComponent = getTabIcon(item.value);
                return (
                  <SelectItem key={item.value} value={item.value}>
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4" />
                      {item.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      ) : (
        /* Desktop Tab List */
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
      )}

      {items.map((item) => (
        <TabsContent key={item.value} value={item.value}>
          {item.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
