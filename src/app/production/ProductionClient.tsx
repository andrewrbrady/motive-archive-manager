"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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

export default function ProductionClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>("shot-lists");

  // Effect to sync with URL params
  useEffect(() => {
    const tab = searchParams.get("tab");
    console.log("Current URL tab:", tab);
    if (tab) {
      console.log("Setting active tab to:", tab);
      setActiveTab(tab);
    } else {
      console.log("Setting default tab");
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "shot-lists");
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [searchParams, router, pathname]);

  // Add specific effect for hard-drives tab
  useEffect(() => {
    if (activeTab === "hard-drives") {
      console.log("Hard drives tab is active, ensuring URL is updated");
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "hard-drives");
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [activeTab, searchParams, router, pathname]);

  const handleTabChange = (value: string) => {
    console.log("Tab change triggered:", value);
    setActiveTab(value);
    const params = new URLSearchParams(searchParams.toString());
    console.log("Previous params:", params.toString());
    params.set("tab", value);
    console.log("New params:", params.toString());
    const newUrl = `${pathname}?${params.toString()}`;
    console.log("New URL:", newUrl);
    router.replace(newUrl);
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
            <TabsList className="mb-6 w-full bg-background-secondary/50 dark:bg-background-secondary/25 p-1 gap-1">
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
                <h3 className="text-lg font-medium mb-4">
                  Upcoming Productions
                </h3>
                <p className="text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                  View and manage upcoming production events associated with
                  cars.
                </p>
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
