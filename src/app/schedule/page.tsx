import { Metadata } from "next";
import ScheduleClient from "./ScheduleClient";

export const metadata: Metadata = {
  title: "Schedule | Motive Archive",
  description: "Manage deliverables and events in one place",
};

export default function SchedulePage() {
  return <ScheduleClient />;
}
