"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Car } from "lucide-react";
import { CarAvatar } from "@/components/ui/CarAvatar";
import { ProjectCar } from "./types";

interface CarSelectionProps {
  projectCars: ProjectCar[];
  selectedCarIds: string[];
  loadingCars: boolean;
  onCarSelection: (carId: string) => void;
  onSelectAllCars: () => void;
}

export function CarSelection({
  projectCars,
  selectedCarIds,
  loadingCars,
  onCarSelection,
  onSelectAllCars,
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

  if (loadingCars) {
    return (
      <div className="space-y-3 p-4 rounded-lg bg-[var(--background-secondary)] border border-[hsl(var(--border-subtle))]">
        <div className="text-sm text-[hsl(var(--foreground-muted))]">
          Loading cars...
        </div>
      </div>
    );
  }

  if (projectCars.length === 0) {
    return (
      <div className="text-center py-8 text-[hsl(var(--foreground-muted))]">
        <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">No cars linked to project</p>
        <p className="text-sm">
          Link cars to this project to generate captions with their
          specifications
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 rounded-lg bg-[var(--background-secondary)] border border-[hsl(var(--border-subtle))]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white">
          Select Cars for Caption
        </h3>
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
    </div>
  );
}
