"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface FiltersState {
  search: string;
  status: string | null;
  businessType: string | null;
}

interface ClientsFiltersProps {
  onFiltersChange?: (filters: FiltersState) => void;
  initialFilters?: FiltersState;
}

const BUSINESS_TYPES = [
  "Dealership",
  "Private Collector",
  "Auction House",
  "Service Center",
  "Other",
];

export default function ClientsFilters({
  onFiltersChange,
  initialFilters = {
    search: "",
    status: null,
    businessType: null,
  },
}: ClientsFiltersProps) {
  const [filters, setFilters] = useState<FiltersState>(initialFilters);

  const handleFilterChange = (
    key: keyof FiltersState,
    value: string | null
  ) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      search: "",
      status: null,
      businessType: null,
    };
    setFilters(resetFilters);
    onFiltersChange?.(resetFilters);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search clients..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <Select
          value={filters.status || "all"}
          onValueChange={(value) =>
            handleFilterChange("status", value === "all" ? null : value)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.businessType || "all"}
          onValueChange={(value) =>
            handleFilterChange("businessType", value === "all" ? null : value)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Business Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {BUSINESS_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={handleReset}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
