"use client";

import React from "react";
import { InventoryItem } from "@/types/inventory";
import { VehicleCard } from "@/components/ui/VehicleCard";

interface InventoryCardProps {
  item: InventoryItem;
  view: "grid" | "list";
}

export function InventoryCard({ item, view }: InventoryCardProps) {
  return (
    <VehicleCard
      vehicle={item}
      variant="inventory"
      view={view}
      showExternalLink
    />
  );
}
