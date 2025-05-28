import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingContainer } from "@/components/ui/loading";
import { Car, CheckSquare } from "lucide-react";
import type { CarDetails } from "./types";

interface CarSelectionProps {
  cars: CarDetails[];
  selectedCarIds: string[];
  onCarSelection: (carIds: string[]) => void;
  onSelectAll: () => void;
  loading: boolean;
}

export function CarSelection({
  cars,
  selectedCarIds,
  onCarSelection,
  onSelectAll,
  loading,
}: CarSelectionProps) {
  const handleCarToggle = (carId: string, checked: boolean) => {
    if (checked) {
      onCarSelection([...selectedCarIds, carId]);
    } else {
      onCarSelection(selectedCarIds.filter((id) => id !== carId));
    }
  };

  const allSelected = cars.length > 0 && selectedCarIds.length === cars.length;
  const someSelected =
    selectedCarIds.length > 0 && selectedCarIds.length < cars.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Car className="w-4 h-4" />
            Cars ({selectedCarIds.length}/{cars.length})
          </CardTitle>
          {cars.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectAll}
              className="flex items-center gap-2"
            >
              <CheckSquare className="w-3 h-3" />
              {allSelected ? "Deselect All" : "Select All"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingContainer />
        ) : cars.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Car className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No cars available</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {cars.map((car) => (
              <div
                key={car._id}
                className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`car-${car._id}`}
                  checked={selectedCarIds.includes(car._id)}
                  onCheckedChange={(checked) =>
                    handleCarToggle(car._id, checked as boolean)
                  }
                />
                <label
                  htmlFor={`car-${car._id}`}
                  className="flex-1 cursor-pointer"
                >
                  <div className="font-medium">
                    {car.year} {car.make} {car.model}
                  </div>
                  {car.color && (
                    <div className="text-sm text-muted-foreground">
                      {car.color}
                    </div>
                  )}
                </label>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
