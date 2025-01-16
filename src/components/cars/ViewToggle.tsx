// components/cars/ViewToggle.tsx
"use client";

import { Button, ButtonGroup } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";

interface ViewToggleProps {
  currentView: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
}

export const ViewToggle = ({ currentView, onViewChange }: ViewToggleProps) => {
  return (
    <ButtonGroup>
      <Button
        variant={currentView === "grid" ? "default" : "outline"}
        onClick={() => onViewChange("grid")}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant={currentView === "list" ? "default" : "outline"}
        onClick={() => onViewChange("list")}
      >
        <List className="h-4 w-4" />
      </Button>
    </ButtonGroup>
  );
};
