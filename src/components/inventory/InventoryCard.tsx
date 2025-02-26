"use client";

import React from "react";
import { VehicleInventoryItem } from "@/types/inventory";
import { VehicleCard } from "@/components/ui/VehicleCard";

interface InventoryCardProps {
  item: VehicleInventoryItem;
  view: "grid" | "list";
}

export function InventoryCard({ item, view }: InventoryCardProps) {
  return (
    <VehicleCard
      vehicle={item}
      variant="inventory"
      _view={view}
      showExternalLink
    />
  );
}
