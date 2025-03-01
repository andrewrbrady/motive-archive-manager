"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { PageTitle } from "@/components/ui/PageTitle";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useUrlParams } from "@/hooks/useUrlParams";
import { cleanupUrlParameters } from "@/utils/urlCleanup";

// Import components from deliverables and events
import DeliverablesList from "@/components/deliverables/DeliverablesList";
import EventsContent from "@/components/schedule/EventsContent";
import CalendarContent from "@/components/schedule/CalendarContent";

export default function ScheduleClient() {
  const pathname = usePathname();
  const { getParam, updateParams } = useUrlParams();
  const [activeTab, setActiveTab] = useState<string>("deliverables");

  // Effect to sync with URL params - runs only once on mount
  useEffect(() => {
    const tab = getParam("tab");

    if (tab) {
      setActiveTab(tab);
    } else {
      // Set default tab if none is specified
      updateParams({ tab: "deliverables" }, { clearOthers: false });
    }
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);

    // Define which parameters should be preserved across all tabs
    const globalParams = ["tab"];

    // Update URL with just the tab parameter
    updateParams(
      { tab: value },
      {
        preserveParams: globalParams,
        clearOthers: true,
      }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <PageTitle title="Schedule" />

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-6 w-full bg-background-secondary/50 dark:bg-background-secondary/25 p-1 gap-1">
              <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
            </TabsList>

            <TabsContent value="deliverables">
              <DeliverablesList />
            </TabsContent>

            <TabsContent value="events">
              <EventsContent />
            </TabsContent>

            <TabsContent value="calendar" className="mt-6">
              <CalendarContent />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
