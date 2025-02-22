import React from "react";
import { fetchMakes } from "@/lib/fetchMakes";
import MakesPageClient from "./MakesPageClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Makes Management - Motive Archive",
  description: "Manage automotive makes and manufacturers",
};

export const dynamic = "force-dynamic";

export default async function MakesPage() {
  const makes = await fetchMakes();

  return <MakesPageClient makes={makes} />;
}
