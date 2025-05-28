import { Metadata } from "next";
import { Suspense } from "react";
import { PageTitle } from "@/components/ui/PageTitle";
import { CustomTabs } from "@/components/ui/custom-tabs";
import DeliverablesList from "@/components/deliverables/DeliverablesList";
import EventsContent from "@/components/schedule/EventsContent";
import CalendarContent from "@/components/schedule/CalendarContent";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
  title: "Schedule | Motive Archive",
  description: "View and manage your schedule and deliverables",
};

function ScheduleContent() {
  return (
    <div className="space-y-6">
      <PageTitle title="Schedule" />
      <CustomTabs
        items={[
          {
            value: "deliverables",
            label: "Deliverables",
            content: <DeliverablesList />,
          },
          {
            value: "events",
            label: "Events",
            content: <EventsContent />,
          },
          {
            value: "calendar",
            label: "Calendar",
            content: <CalendarContent />,
          },
        ]}
        defaultValue="deliverables"
        basePath="/schedule"
      />
    </div>
  );
}

export default function SchedulePage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            Loading...
          </div>
        }
      >
        <ScheduleContent />
      </Suspense>
    </AuthGuard>
  );
}
