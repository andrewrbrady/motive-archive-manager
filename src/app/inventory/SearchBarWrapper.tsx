// app/inventory/SearchBarWrapper.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import SearchBar from "@/components/SearchBar";

// Common search suggestions
const SEARCH_SUGGESTIONS = [
  "Ferrari",
  "Porsche",
  "Lamborghini",
  "McLaren",
  "Aston Martin",
  "Bentley",
  "SUV",
  "Coupe",
  "Convertible",
  "Sedan",
  "New",
  "Pre-owned",
];

export default function SearchBarWrapper({
  initialSearch,
}: {
  initialSearch: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);

  const handleSearch = (searchQuery: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("search", searchQuery);
    params.set("page", "1"); // Reset to first page on new search
    router.push(`/inventory?${params.toString()}`);
  };

  return (
    <SearchBar
      value={search}
      onChange={(value) => setSearch(value)}
      onSearch={() => handleSearch(search)}
      suggestions={SEARCH_SUGGESTIONS}
    />
  );
}
