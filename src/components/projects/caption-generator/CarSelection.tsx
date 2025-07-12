"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Car, ChevronDown, ChevronRight } from "lucide-react";
import { CarAvatar } from "@/components/ui/CarAvatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ProjectCar } from "./types";

interface CarSelectionProps {
  projectCars: ProjectCar[];
  selectedCarIds: string[];
  loadingCars: boolean;
  onCarSelection: (carId: string) => void;
  onSelectAllCars: () => void;
  // Collapsible props
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

export function CarSelection({
  projectCars,
  selectedCarIds,
  loadingCars,
  onCarSelection,
  onSelectAllCars,
  isOpen = true,
  onToggle,
}: CarSelectionProps) {
  const formatCarName = (car: ProjectCar) => {
    const parts = [car.year, car.make, car.model].filter(Boolean);
    return parts.join(" ");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800 border-green-200";
      case "sold":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const renderContent = () => {
    if (loadingCars) {
      return (
        <div className="text-sm text-[hsl(var(--foreground-muted))]">
          Loading cars...
        </div>
      );
    }

    if (projectCars.length === 0) {
      return (
        <div className="text-center py-6 text-[hsl(var(--foreground-muted))]">
          <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium mb-1">No cars linked to project</p>
          <p className="text-xs">
            Link cars to this project to generate captions with their
            specifications
          </p>
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 gap-3">
          {projectCars.map((car) => {
            const isSelected = selectedCarIds.includes(car._id);

            return (
              <button
                key={car._id}
                onClick={() => onCarSelection(car._id)}
                className={`flex items-center space-x-3 p-3 border rounded-lg transition-all text-left w-full ${
                  isSelected
                    ? "border-blue-500/50"
                    : "border-[hsl(var(--border-subtle))] hover:border-white"
                }`}
              >
                {/* Car Avatar */}
                <div className="flex-shrink-0">
                  <CarAvatar
                    primaryImageId={car.primaryImageId}
                    entityName={formatCarName(car)}
                    size="md"
                    className="rounded-lg"
                  />
                </div>

                <div className="flex-1">
                  <div className="font-medium text-sm text-[hsl(var(--foreground))] dark:text-white">
                    {formatCarName(car)}
                  </div>
                  <div className="text-xs text-[hsl(var(--foreground-muted))]">
                    {car.color && <span>{car.color}</span>}
                    {car.vin && (
                      <span>
                        {car.color ? " • " : ""}VIN: {car.vin}
                      </span>
                    )}
                  </div>
                </div>

                <span
                  className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(car.status)}`}
                >
                  {car.status}
                </span>
              </button>
            );
          })}
        </div>

        {selectedCarIds.length > 0 && (
          <div className="text-sm text-[hsl(var(--foreground-muted))]">
            {selectedCarIds.length} car
            {selectedCarIds.length !== 1 ? "s" : ""} selected
          </div>
        )}
      </>
    );
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="space-y-3 p-4 rounded-lg bg-[var(--background-secondary)] border border-[hsl(var(--border-subtle))]">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 p-0 h-auto font-medium text-[hsl(var(--foreground))] dark:text-white hover:bg-transparent"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Car className="h-4 w-4" />
              Select Cars for Caption
              {selectedCarIds.length > 0 && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  {selectedCarIds.length}
                </span>
              )}
            </Button>
          </CollapsibleTrigger>
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectAllCars}
            className="border-[hsl(var(--border))]"
          >
            {selectedCarIds.length === projectCars.length
              ? "Deselect All"
              : "Select All"}
          </Button>
        </div>

        <CollapsibleContent>{renderContent()}</CollapsibleContent>
      </div>
    </Collapsible>
  );
}
