"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SortOption = {
  label: string;
  value: string;
  field: string;
  direction: "asc" | "desc";
};

const sortOptions: SortOption[] = [
  {
    label: "Recently Added",
    value: "createdAt_desc",
    field: "createdAt",
    direction: "desc",
  },
  {
    label: "Price: High to Low",
    value: "price_desc",
    field: "price",
    direction: "desc",
  },
  {
    label: "Price: Low to High",
    value: "price_asc",
    field: "price",
    direction: "asc",
  },
  {
    label: "Year: Newest First",
    value: "year_desc",
    field: "year",
    direction: "desc",
  },
  {
    label: "Year: Oldest First",
    value: "year_asc",
    field: "year",
    direction: "asc",
  },
  {
    label: "Make: A to Z",
    value: "make_asc",
    field: "make",
    direction: "asc",
  },
  {
    label: "Make: Z to A",
    value: "make_desc",
    field: "make",
    direction: "desc",
  },
];

interface SortSelectorProps {
  currentSort?: string;
}

export default function SortSelector({
  currentSort = "createdAt_desc",
}: SortSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("sort", value);
    params.set("page", "1"); // Reset to first page when sorting changes
    router.push(`/cars?${params.toString()}`);
  };

  return (
    <Select value={currentSort} onValueChange={handleSortChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Sort by..." />
      </SelectTrigger>
      <SelectContent>
        {sortOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { sortOptions };
