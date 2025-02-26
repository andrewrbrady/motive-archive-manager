import { Metadata } from "next";
import LocationsClient from "./LocationsClient";

export const metadata: Metadata = {
  title: "Locations | Motive Archive",
  description: "Manage locations for Motive Archive",
};

export default function LocationsPage() {
  return <LocationsClient />;
}
