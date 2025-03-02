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
import { CustomTabs, TabItem } from "@/components/ui/custom-tabs";

export default function ProductionClient() {
  const pathname = usePathname();
  const { getParam, updateParams } = useUrlParams();
  const [activeTab, setActiveTab] = useState<string>("shot-lists");
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);

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
          <PageTitle title="Production">
            <div className="flex gap-2">
              <Button
                onClick={() => setShowNewTemplateModal(true)}
                className="flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </div>
          </PageTitle>

          <CustomTabs
            items={[
              {
                value: "shot-lists",
                label: "Shot List Templates",
                content: <ShotListTemplatesTab />,
              },
              {
                value: "scripts",
                label: "Script Templates",
                content: <ScriptTemplatesTab />,
              },
              {
                value: "raw-assets",
                label: "Raw Assets",
                content: <RawAssetsTab />,
              },
              {
                value: "upcoming",
                label: "Upcoming Productions",
                content: (
                  <div className="text-center py-12 text-muted-foreground">
                    Upcoming productions feature coming soon
                  </div>
                ),
              },
              {
                value: "studio-inventory",
                label: "Studio Inventory",
                content: <StudioInventoryTab />,
              },
              {
                value: "hard-drives",
                label: "Hard Drives",
                content: <HardDrivesTab />,
              },
            ]}
            defaultValue={activeTab}
            basePath="/production"
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
