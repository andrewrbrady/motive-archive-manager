import { Metadata } from "next";
import ScheduleClient from "./ScheduleClient";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
  title: "Schedule | Motive Archive",
  description: "Manage deliverables and events in one place",
};

export default function SchedulePage() {
  return (
    <AuthGuard>
      <ScheduleClient />
    </AuthGuard>
  );
}
