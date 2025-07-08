"use client";

import { useState, useEffect } from "react";
import { LocationResponse } from "@/models/location";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MapPin, Filter } from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "react-hot-toast";

interface LocationsFilterProps {
  selectedLocation: string | null;
  onLocationChange: (locationId: string | null) => void;
}

export default function LocationsFilter({
  selectedLocation,
  onLocationChange,
}: LocationsFilterProps) {
  const api = useAPI();
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      if (!api) return;

      setIsLoading(true);
      try {
        const data = await api.get<LocationResponse[]>("/locations");
        setLocations(data);
      } catch (error) {
        console.error("Error fetching locations:", error);
        toast.error("Failed to fetch locations");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocations();
  }, [api]);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center text-muted-foreground">
        <Filter className="w-4 h-4 mr-1" />
        <Label htmlFor="location-filter" className="text-sm whitespace-nowrap">
          Location:
        </Label>
      </div>
      <Select
        value={selectedLocation || "all"}
        onValueChange={(value) =>
          onLocationChange(value === "all" ? null : value)
        }
        disabled={isLoading}
      >
        <SelectTrigger id="location-filter" className="w-[180px]">
          <SelectValue placeholder="All Locations" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Locations</SelectItem>
          {locations.map((location) => (
            <SelectItem key={location.id} value={location.id}>
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3" />
                {location.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
