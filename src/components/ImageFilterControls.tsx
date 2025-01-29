import React from "react";
import { Compass, Eye, Sun, Move } from "lucide-react";

interface _ImageMetadata {
  angle?: string;
  description?: string;
  movement?: string;
  tod?: string;
  view?: string;
  side?: string;
}

interface ImageFilterControlsProps {
  filters: {
    angle?: string;
    movement?: string;
    tod?: string;
    view?: string;
    side?: string;
  };
  onFilterChange: (filters: ImageFilterControlsProps["filters"]) => void;
  availableFilters: {
    angles: string[];
    movements: string[];
    tods: string[];
    views: string[];
    sides: string[];
  };
}

export const ImageFilterControls: React.FC<ImageFilterControlsProps> = ({
  filters,
  onFilterChange,
  availableFilters,
}) => {
  const handleFilterChange = (
    key: keyof typeof filters,
    value: string | undefined
  ) => {
    onFilterChange({
      ...filters,
      [key]: value === filters[key] ? undefined : value,
    });
  };

  return (
    <div className="space-y-4 bg-white rounded-lg shadow p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Angle Filter */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500 uppercase text-xs font-medium">
              Angle
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableFilters.angles.map((angle) => (
              <button
                key={angle}
                onClick={() => handleFilterChange("angle", angle)}
                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                  filters.angle === angle
                    ? "bg-blue-500 text-white border-blue-500"
                    : "border-gray-200 text-gray-600 hover:border-blue-500"
                }`}
              >
                {angle}
              </button>
            ))}
          </div>
        </div>

        {/* View Filter */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500 uppercase text-xs font-medium">
              View
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableFilters.views.map((view) => (
              <button
                key={view}
                onClick={() => handleFilterChange("view", view)}
                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                  filters.view === view
                    ? "bg-blue-500 text-white border-blue-500"
                    : "border-gray-200 text-gray-600 hover:border-blue-500"
                }`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        {/* Time of Day Filter */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Sun className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500 uppercase text-xs font-medium">
              Time of Day
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableFilters.tods.map((tod) => (
              <button
                key={tod}
                onClick={() => handleFilterChange("tod", tod)}
                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                  filters.tod === tod
                    ? "bg-blue-500 text-white border-blue-500"
                    : "border-gray-200 text-gray-600 hover:border-blue-500"
                }`}
              >
                {tod}
              </button>
            ))}
          </div>
        </div>

        {/* Movement Filter */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Move className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500 uppercase text-xs font-medium">
              Movement
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableFilters.movements.map((movement) => (
              <button
                key={movement}
                onClick={() => handleFilterChange("movement", movement)}
                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                  filters.movement === movement
                    ? "bg-blue-500 text-white border-blue-500"
                    : "border-gray-200 text-gray-600 hover:border-blue-500"
                }`}
              >
                {movement}
              </button>
            ))}
          </div>
        </div>

        {/* Side Filter */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500 uppercase text-xs font-medium">
              Side
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableFilters.sides.map((side) => (
              <button
                key={side}
                onClick={() => handleFilterChange("side", side)}
                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                  filters.side === side
                    ? "bg-blue-500 text-white border-blue-500"
                    : "border-gray-200 text-gray-600 hover:border-blue-500"
                }`}
              >
                {side}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
