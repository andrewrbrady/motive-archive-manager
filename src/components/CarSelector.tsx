"use client";

import React, { useState, useEffect, useRef } from "react";
import { Car } from "@/types/car";
import { Search, X } from "lucide-react";
import _ from "lodash";
import { LoadingSpinner } from "@/components/ui/loading";
import { useAPI } from "@/hooks/useAPI";

interface CarSelectorProps {
  selectedCars: Car[];
  onSelect: (cars: Car[]) => void;
}

export default function CarSelector({
  selectedCars,
  onSelect,
}: CarSelectorProps) {
  const api = useAPI();
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<Car[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const [recentSearchCache, setRecentSearchCache] = useState<
    Record<string, Car[]>
  >({});

  // Define searchCars function first
  const searchCars = async (query: string) => {
    if (!query) {
      setSuggestions([]);
      return;
    }

    if (!api) return; // Guard against null api

    if (recentSearchCache[query]) {
      const cachedResults = recentSearchCache[query].filter(
        (car: Car) => !selectedCars.some((selected) => selected._id === car._id)
      );
      setSuggestions(cachedResults);
      return;
    }

    setLoading(true);
    try {
      const data = (await api.get(
        `/api/cars?search=${encodeURIComponent(
          query
        )}&sort=createdAt_desc&fields=_id,year,make,model,manufacturing,color`
      )) as { cars: Car[] };

      setRecentSearchCache((prev) => ({
        ...prev,
        [query]: data.cars,
      }));

      setSuggestions(
        data.cars.filter(
          (car: Car) =>
            !selectedCars.some((selected) => selected._id === car._id)
        )
      );
    } catch (error) {
      console.error("Error searching cars:", error);
    } finally {
      setLoading(false);
    }
  };

  // Now define debounced version
  const debouncedSearch = _.debounce(searchCars, 300);

  useEffect(() => {
    if (!api) return; // Guard clause
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel();
  }, [searchTerm, api]); // Include api in dependencies

  useEffect(() => {
    // Reset selected index when suggestions change
    setSelectedIndex(-1);
  }, [suggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Early return if API not ready (AFTER all hooks)
  if (!api) return <LoadingSpinner size="sm" />;

  // Utility function for consistent car display formatting
  const formatCarDisplay = (car: Car): string => {
    // Helper to format a car ID nicely (first 8 chars with hyphen)
    const formatCarId = (id: string): string => {
      if (!id) return "Unknown";
      const cleanId = id.toString().replace(/[^a-zA-Z0-9]/g, "");
      return cleanId.substring(0, 8);
    };

    // If we have make and model, prioritize displaying that
    if (car.make || car.model) {
      const year = car.year ? `${car.year} ` : "";
      const make = car.make ? car.make.trim() : "";
      const model = car.model ? car.model.trim() : "";

      let display = `${year}${make} ${model}`.trim();

      // Add manufacturing details if available
      if (car.manufacturing?.series) {
        display += ` ${car.manufacturing.series}`;
      }

      if (car.manufacturing?.trim) {
        display += ` (${car.manufacturing.trim})`;
      }

      return display;
    }

    // If we don't have make/model data, use a more user-friendly car ID format
    return `Car ${formatCarId(car._id)}`;
  };

  const handleSelect = (car: Car) => {
    console.log("Selected car:", {
      id: car._id,
      make: car.make || "(empty make)",
      model: car.model || "(empty model)",
      year: car.year || "(empty year)",
    });
    onSelect([...selectedCars, car]);
    setSearchTerm("");
    setShowSuggestions(false);
  };

  const handleRemove = (carId: string) => {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Removing car with ID:", carId);
    const updatedCars = selectedCars.filter((car) => car._id !== carId);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Updated car list:", updatedCars);
    onSelect(updatedCars);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || loading || suggestions.length === 0) return;

    // Navigate through suggestions with arrow keys
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="space-y-4">
      <div ref={searchRef} className="relative">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search cars..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--foreground-muted))] focus:outline-none focus:border-[hsl(var(--info))] focus:ring-1 focus:ring-[hsl(var(--info))]"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[hsl(var(--foreground-muted))]" />
        </div>

        {showSuggestions && (searchTerm || loading) && (
          <div className="absolute z-10 w-full mt-1 bg-[hsl(var(--background))] rounded-lg shadow-lg border border-[hsl(var(--border))] max-h-60 overflow-auto">
            {loading ? (
              <div className="px-4 py-2 flex justify-center">
                <LoadingSpinner size="sm" />
                <span className="ml-2">Loading...</span>
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map((car, index) => (
                <div
                  key={car._id}
                  className={`px-4 py-2 cursor-pointer ${
                    index === selectedIndex
                      ? "bg-[hsl(var(--accent))]"
                      : "hover:bg-[hsl(var(--accent))]"
                  } text-[hsl(var(--foreground))]`}
                  onClick={() => handleSelect(car)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <span>{formatCarDisplay(car)}</span>
                    {car.color && (
                      <span className="text-[hsl(var(--foreground-muted))] text-sm">
                        {car.color}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : searchTerm ? (
              <div className="px-4 py-2 text-[hsl(var(--foreground-muted))]">
                No cars found
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {selectedCars.map((car) => (
          <div
            key={car._id}
            className="inline-flex items-center gap-2 px-3 py-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-full text-sm"
          >
            {formatCarDisplay(car)}
            {car.color && (
              <span className="opacity-70 text-xs">({car.color})</span>
            )}
            <button
              onClick={() => handleRemove(car._id)}
              className="text-[hsl(var(--secondary-foreground))] hover:text-[hsl(var(--destructive))] opacity-70 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
