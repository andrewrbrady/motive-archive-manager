"use client";

import React, { Suspense } from "react";
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

function SortSelectorCore({
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
      <SelectTrigger className="text-sm">
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

export default function SortSelector({
  currentSort = "createdAt_desc",
}: SortSelectorProps) {
  return (
    <Suspense fallback={
      <Select value={currentSort} disabled>
        <SelectTrigger className="text-sm">
          <SelectValue placeholder="Sort by..." />
        </SelectTrigger>
      </Select>
    }>
      <SortSelectorCore currentSort={currentSort} />
    </Suspense>
  );
}

export { sortOptions };
