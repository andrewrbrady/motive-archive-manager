"use client";

import React from "react";
import { PageTitle } from "@/components/ui/PageTitle";
import { CarAvatar } from "@/components/ui/CarAvatar";
import { generateCarTitle } from "@/utils/car-helpers";

interface CarHeaderProps {
  car: any; // Using any for now since we don't have the exact car type
}

export function CarHeader({ car }: CarHeaderProps) {
  const carTitle = generateCarTitle(car);

  return (
    <div className="flex items-center gap-4 mb-6">
      <CarAvatar primaryImageId={car?.primaryImageId} entityName={carTitle} />
      <PageTitle title={carTitle} className="" />
    </div>
  );
}
