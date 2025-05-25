"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import InspectionForm from "@/components/cars/InspectionForm";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function NewInspectionPage() {
  const params = useParams();
  const router = useRouter();
  const carId = params?.id?.toString();

  const handleSave = () => {
    // Navigate back to the inspections tab
    router.push(`/cars/${carId}?tab=inspections`);
  };

  const handleCancel = () => {
    // Navigate back to the inspections tab
    router.push(`/cars/${carId}?tab=inspections`);
  };

  if (!carId) {
    return null;
  }

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-background">
        <div className="container-wide px-6 py-8">
          <InspectionForm
            carId={carId}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </AuthGuard>
  );
}
