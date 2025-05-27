"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";

interface ContactsFiltersProps {
  initialFilters: {
    search: string;
    status: string | null;
    company: string | null;
    role: string | null;
  };
  onFiltersChange: (filters: any) => void;
}

export default function ContactsFilters({
  initialFilters,
  onFiltersChange,
}: ContactsFiltersProps) {
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  };

  const handleStatusChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      status: value === "all" ? null : value,
    }));
  };

  const handleCompanyChange = (value: string) => {
    setFilters((prev) => ({ ...prev, company: value || null }));
  };

  const handleRoleChange = (value: string) => {
    setFilters((prev) => ({ ...prev, role: value || null }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      status: null,
      company: null,
      role: null,
    });
  };

  const hasActiveFilters =
    filters.search || filters.status || filters.company || filters.role;

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search contacts..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          value={filters.status || "all"}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Company"
          value={filters.company || ""}
          onChange={(e) => handleCompanyChange(e.target.value)}
          className="w-[150px]"
        />

        <Input
          placeholder="Role"
          value={filters.role || ""}
          onChange={(e) => handleRoleChange(e.target.value)}
          className="w-[150px]"
        />

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
