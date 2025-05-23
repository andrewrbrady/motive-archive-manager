"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
// import Navbar from "@/components/layout/navbar"; // Removed Navbar import
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Template type selection modal
function NewTemplateModal({
  open,
  onOpenChange,
  onSelectType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectType: (type: "shot-list" | "script") => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Template</DialogTitle>
          <DialogDescription>
            Select the type of template you want to create
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <Button
            variant="outline"
            className="h-24 flex flex-col"
            onClick={() => onSelectType("shot-list")}
          >
            <span className="text-lg font-medium mb-1">Shot List</span>
            <span className="text-xs text-muted-foreground">
              Create a template for photo or video shoots
            </span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex flex-col"
            onClick={() => onSelectType("script")}
          >
            <span className="text-lg font-medium mb-1">Script</span>
            <span className="text-xs text-muted-foreground">
              Create a template for video scripts
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ProductionClient() {
  const pathname = usePathname();
  const { getParam, updateParams } = useUrlParams();
  const [activeTab, setActiveTab] = useState<string>("shot-lists");
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [shouldCreateShotListTemplate, setShouldCreateShotListTemplate] =
    useState(false);
  const [shouldCreateScriptTemplate, setShouldCreateScriptTemplate] =
    useState(false);

  // Effect to sync with URL params - runs only once on mount
  useEffect(() => {
    // Get the tab parameter from the URL
    const tab = getParam("tab");
    const template = getParam("template");

    // Only set tab from URL if it exists
    if (tab) {
      setActiveTab(tab);

      // Check if we're on a non-template tab and need to remove the template parameter
      const isTemplateTab = tab === "shot-lists" || tab === "scripts";
      if (!isTemplateTab && template) {
        // If on a non-template tab but template parameter exists, remove it
        console.log(
          "ProductionClient: Removing template parameter on page load (non-template tab)"
        );
        updateParams(
          { template: null },
          {
            preserveParams: ["tab"],
            clearOthers: false,
            context: `tab:${tab}`,
          }
        );
      }
    } else {
      // Set default tab in state if none in URL
      setActiveTab("shot-lists");

      // Check if we need to clear template parameter regardless of tab
      if (template) {
        console.log(
          "ProductionClient: Removing template parameter on fresh page load"
        );
        updateParams(
          { tab: "shot-lists", template: null },
          { clearOthers: true }
        );
      }
      // Only update URL if there's no tab parameter and no template
      else if (!window.location.search.includes("tab=")) {
        // Just set the tab without preserving/adding other parameters like template
        updateParams({ tab: "shot-lists" }, { clearOthers: true });
      }
    }
  }, []);

  // Add a second useEffect to continuously monitor for template parameter in non-template tabs
  useEffect(() => {
    const template = getParam("template");
    const isTemplateTab = activeTab === "shot-lists" || activeTab === "scripts";

    // If we're on a non-template tab but still have a template parameter, fix it
    if (!isTemplateTab && template) {
      console.log(
        "ProductionClient: Continuous monitoring - removing template parameter from non-template tab"
      );

      // Force-reset the URL parameters immediately
      const params = new URLSearchParams(window.location.search);
      params.delete("template");

      // Update the component state and URL without adding to browser history
      updateParams(
        { template: null },
        {
          preserveParams: ["tab"],
          context: `tab:${activeTab}`,
          clearOthers: false,
        }
      );
    }
  }, [activeTab]);

  const handleTabChange = (value: string) => {
    // [REMOVED] // [REMOVED] console.log("ProductionClient: Tab changed to:", value);

    // Immediately update the component state
    setActiveTab(value);

    // Check if the new tab is a template-related tab
    const isTemplateTab = value === "shot-lists" || value === "scripts";
    console.log(
      "ProductionClient: Is new tab template-related:",
      isTemplateTab
    );

    // Create updates object - always includes the tab parameter
    const updates: Record<string, string | null> = { tab: value };

    // If switching to a non-template tab, explicitly remove the template parameter
    if (!isTemplateTab) {
      // [REMOVED] // [REMOVED] console.log("ProductionClient: Removing template parameter from URL");
      updates.template = null; // This will remove the template parameter
    }

    // For non-template tabs, preserve ONLY the tab parameter, nothing else
    const preserveParams = isTemplateTab ? ["tab", "template"] : ["tab"];

    // Force a full update with context awareness
    updateParams(updates, {
      preserveParams,
      clearOthers: true,
      context: `tab:${value}`,
    });
  };

  // Add a useEffect to respond to activeTab changes
  // This ensures URL parameters stay in sync with the active tab
  useEffect(() => {
    // This effect runs whenever activeTab changes
    const isTemplateTab = activeTab === "shot-lists" || activeTab === "scripts";
    const template = getParam("template");

    // If we're on a non-template tab but template parameter exists, remove it
    if (!isTemplateTab && template) {
      // [REMOVED] // [REMOVED] console.log("Cleanup effect: Removing template parameter from URL");
      updateParams(
        { template: null },
        { preserveParams: ["tab"], clearOthers: false }
      );
    }
  }, [activeTab, getParam]);

  // Handle template type selection
  const handleTemplateTypeSelect = (type: "shot-list" | "script") => {
    // Close the modal
    setShowNewTemplateModal(false);

    // Navigate to the appropriate tab
    const targetTab = type === "shot-list" ? "shot-lists" : "scripts";

    // If we're already on the right tab, set the appropriate state
    if (activeTab === targetTab) {
      if (type === "shot-list") {
        setShouldCreateShotListTemplate(true);
        // Reset after a small delay to avoid continuous re-renders
        setTimeout(() => setShouldCreateShotListTemplate(false), 500);
      } else {
        setShouldCreateScriptTemplate(true);
        // Reset after a small delay to avoid continuous re-renders
        setTimeout(() => setShouldCreateScriptTemplate(false), 500);
      }
    } else {
      // If we need to switch tabs, set the appropriate state after switching
      setActiveTab(targetTab);

      // Update URL parameters
      updateParams(
        { tab: targetTab },
        {
          preserveParams: ["template"],
          clearOthers: true,
          context: `tab:${targetTab}`,
        }
      );

      // Set the appropriate state after a small delay to ensure the tab has changed
      setTimeout(() => {
        if (type === "shot-list") {
          setShouldCreateShotListTemplate(true);
          // Reset after a small delay
          setTimeout(() => setShouldCreateShotListTemplate(false), 500);
        } else {
          setShouldCreateScriptTemplate(true);
          // Reset after a small delay
          setTimeout(() => setShouldCreateScriptTemplate(false), 500);
        }
      }, 100);
    }
  };

  // Check if the current tab is template-related
  const isTemplateTab = activeTab === "shot-lists" || activeTab === "scripts";

  // Log to help with debugging
  // [REMOVED] // [REMOVED] console.log("Active Tab:", activeTab, "Is Template Tab:", isTemplateTab);

  return (
    <div className="min-h-screen bg-background">
      {/* <Navbar /> */} {/* Removed Navbar component */}
      <div className="space-y-6">
        <PageTitle title="Production" />

        <CustomTabs
          items={[
            {
              value: "shot-lists",
              label: "Shot List Templates",
              content: (
                <ShotListTemplatesTab
                  shouldCreateTemplate={shouldCreateShotListTemplate}
                />
              ),
            },
            {
              value: "scripts",
              label: "Script Templates",
              content: (
                <ScriptTemplatesTab
                  shouldCreateTemplate={shouldCreateScriptTemplate}
                />
              ),
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
      {/* Template selection modal */}
      <NewTemplateModal
        open={showNewTemplateModal}
        onOpenChange={setShowNewTemplateModal}
        onSelectType={handleTemplateTypeSelect}
      />
    </div>
  );
}
