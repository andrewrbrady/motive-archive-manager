"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomTabs, TabItem } from "@/components/ui/custom-tabs";
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
    <CustomTabs
      items={[
        {
          value: "list",
          label: "List View",
          content: <DeliverablesList />,
        },
        {
          value: "calendar",
          label: "Calendar View",
          content: <DeliverablesCalendar />,
        },
      ]}
      defaultValue={view}
      basePath="/deliverables"
      className="w-full"
    />
  );
}
