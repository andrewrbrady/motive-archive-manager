"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DeliverablesList from "@/components/deliverables/DeliverablesList";
import DeliverablesCalendar from "@/components/deliverables/DeliverablesCalendar";

export default function DeliverablesTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "list";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("view", value);
    router.push(`/deliverables?${params.toString()}`);
  };

  return (
    <Tabs value={view} onValueChange={handleTabChange} className="w-full">
      <TabsList>
        <TabsTrigger value="list">List View</TabsTrigger>
        <TabsTrigger value="calendar">Calendar View</TabsTrigger>
      </TabsList>
      <TabsContent value="list" className="mt-6">
        <DeliverablesList />
      </TabsContent>
      <TabsContent value="calendar" className="mt-6">
        <DeliverablesCalendar />
      </TabsContent>
    </Tabs>
  );
}
