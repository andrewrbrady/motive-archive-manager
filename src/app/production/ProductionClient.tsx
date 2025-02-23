"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { PageTitle } from "@/components/ui/PageTitle";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ShotListTemplatesTab from "@/components/production/ShotListTemplatesTab";
import ScriptTemplatesTab from "@/components/production/ScriptTemplatesTab";

export default function ProductionClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(() => {
    const tab = searchParams.get("tab");
    return tab || "shot-lists";
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("tab", value);
    router.push(`/production?${newParams.toString()}`, {
      scroll: false,
    });
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
              <TabsTrigger value="upcoming">Upcoming Productions</TabsTrigger>
              <TabsTrigger value="inventory">Studio Inventory</TabsTrigger>
              <TabsTrigger value="drives">Hard Drives</TabsTrigger>
            </TabsList>

            <TabsContent value="shot-lists">
              <ShotListTemplatesTab />
            </TabsContent>

            <TabsContent value="scripts">
              <ScriptTemplatesTab />
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

            <TabsContent value="inventory">
              <div className="bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">Studio Inventory</h3>
                <p className="text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                  Manage your studio's equipment inventory, including cameras,
                  lenses, lights, and other gear.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="drives">
              <div className="bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">Hard Drives</h3>
                <p className="text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                  Track and manage hard drives used for storing production
                  footage and assets.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
