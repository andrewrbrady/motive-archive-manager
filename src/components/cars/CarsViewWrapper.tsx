// components/cars/CarsViewWrapper.tsx
"use client";

import React from "react";
import { Car } from "@/types/car";
import GridView from "./GridView";
import ListView from "./ListView";

interface CarsViewWrapperProps {
  cars: Car[];
  viewMode: "grid" | "list";
  currentSearchParams: string;
}

export default function CarsViewWrapper({
  cars,
  viewMode,
  currentSearchParams,
}: CarsViewWrapperProps) {
  return viewMode === "grid" ? (
    <GridView cars={cars} currentSearchParams={currentSearchParams} />
  ) : (
    <ListView cars={cars} currentSearchParams={currentSearchParams} />
  );
}
