"use client";

import React, { useState, useEffect, useRef } from "react";
import { Car } from "@/types/car";
import { Search, X } from "lucide-react";
import _ from "lodash";

interface CarSelectorProps {
  selectedCars: Car[];
  onSelect: (cars: Car[]) => void;
}

export default function CarSelector({
  selectedCars,
  onSelect,
}: CarSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<Car[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const searchCars = async (query: string) => {
    if (!query) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/cars?search=${encodeURIComponent(query)}&sort=createdAt_desc`
      );
      if (!response.ok) throw new Error("Failed to fetch cars");
      const data = await response.json();
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

  const debouncedSearch = _.debounce(searchCars, 300);

  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel();
  }, [searchTerm]);

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

  const handleSelect = (car: Car) => {
    onSelect([...selectedCars, car]);
    setSearchTerm("");
    setShowSuggestions(false);
  };

  const handleRemove = (carId: string) => {
    onSelect(selectedCars.filter((car) => car._id !== carId));
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
            placeholder="Search cars..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--foreground-muted))] focus:outline-none focus:border-[hsl(var(--info))] focus:ring-1 focus:ring-[hsl(var(--info))]"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[hsl(var(--foreground-muted))]" />
        </div>

        {showSuggestions && (searchTerm || loading) && (
          <div className="absolute z-10 w-full mt-1 bg-[hsl(var(--background))] rounded-lg shadow-lg border border-[hsl(var(--border))] max-h-60 overflow-auto">
            {loading ? (
              <div className="px-4 py-2 text-[hsl(var(--foreground-muted))]">
                Loading...
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map((car) => (
                <div
                  key={car._id}
                  className="px-4 py-2 cursor-pointer hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
                  onClick={() => handleSelect(car)}
                >
                  <div className="flex items-center justify-between">
                    <span>
                      {car.year} {car.make} {car.model}
                      {car.manufacturing?.series &&
                        ` ${car.manufacturing.series}`}
                      {car.manufacturing?.trim &&
                        ` (${car.manufacturing.trim})`}
                    </span>
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
            className="inline-flex items-center gap-2 px-3 py-1 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-full text-sm text-[hsl(var(--foreground))]"
          >
            {car.year} {car.make} {car.model}
            <button
              onClick={() => handleRemove(car._id)}
              className="text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--destructive))]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
