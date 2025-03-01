"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { PageTitle } from "@/components/ui/PageTitle";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ShotListTemplatesTab from "@/components/production/ShotListTemplatesTab";
import ScriptTemplatesTab from "@/components/production/ScriptTemplatesTab";
import RawAssetsTab from "@/components/production/RawAssetsTab";
import HardDrivesTab from "@/components/production/HardDrivesTab";
import StudioInventoryTab from "@/components/production/StudioInventoryTab";
import { useUrlParams } from "@/hooks/useUrlParams";
import { cleanupUrlParameters, getCurrentContext } from "@/utils/urlCleanup";
import { LoadingContainer } from "@/components/ui/loading-container";

export default function ProductionClient() {
  const pathname = usePathname();
  const { getParam, updateParams } = useUrlParams();
  const [activeTab, setActiveTab] = useState<string>("shot-lists");

  // Effect to sync with URL params - runs only once on mount
  useEffect(() => {
    const tab = getParam("tab");
    const template = getParam("template");

    if (tab) {
      setActiveTab(tab);
    } else if (template) {
      // If template parameter is present but tab is not, determine the appropriate tab
      // using the getCurrentContext function
      const context = getCurrentContext(
        new URLSearchParams(window.location.search)
      );
      const targetTab = context.startsWith("tab:")
        ? context.substring(4)
        : "shot-lists";

      updateParams({ tab: targetTab, template }, { clearOthers: false });
      setActiveTab(targetTab);
    } else {
      // Set default tab if none is specified
      updateParams({ tab: "shot-lists" }, { clearOthers: true });
    }
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);

    // Define which parameters should be preserved across all tabs
    const globalParams = ["tab", "template"];

    // Update URL with context awareness - clear unrelated parameters
    updateParams(
      { tab: value },
      {
        preserveParams: globalParams,
        clearOthers: true,
        context: `tab:${value}`,
      }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <PageTitle title="Production Management">
            <div className="flex items-center gap-4 ml-auto">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </div>
          </PageTitle>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-6 w-full">
              <TabsTrigger value="shot-lists">Shot List Templates</TabsTrigger>
              <TabsTrigger value="scripts">Script Templates</TabsTrigger>
              <TabsTrigger value="raw-assets">Raw Assets</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming Productions</TabsTrigger>
              <TabsTrigger value="studio-inventory">
                Studio Inventory
              </TabsTrigger>
              <TabsTrigger value="hard-drives">Hard Drives</TabsTrigger>
            </TabsList>

            <TabsContent value="shot-lists">
              <ShotListTemplatesTab />
            </TabsContent>

            <TabsContent value="scripts">
              <ScriptTemplatesTab />
            </TabsContent>

            <TabsContent value="raw-assets">
              <RawAssetsTab />
            </TabsContent>

            <TabsContent value="upcoming">
              <div className="bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-lg p-6">
                <p className="text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                  View and manage upcoming production events associated with
                  cars.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="upcoming">
              <div className="bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-lg p-6">
                {/* Loading state would be here - demonstrating the pattern */}
                {false ? (
                  <LoadingContainer text="Loading upcoming productions..." />
                ) : (
                  <p className="text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                    View and manage upcoming production events associated with
                    cars.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="studio-inventory">
              <StudioInventoryTab />
            </TabsContent>

            <TabsContent value="hard-drives">
              <HardDrivesTab />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
