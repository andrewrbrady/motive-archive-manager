import React from "react";
import { fetchModels } from "@/lib/fetchModels";
import ModelsPageClient from "./ModelsPageClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vehicle Models - Motive Archive",
  description: "Manage vehicle models and specifications",
};

export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  const models = await fetchModels();

  return <ModelsPageClient models={models} />;
}
