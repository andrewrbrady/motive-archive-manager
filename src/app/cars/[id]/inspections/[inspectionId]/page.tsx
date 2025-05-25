"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import InspectionReport from "@/components/cars/InspectionReport";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Inspection } from "@/types/inspection";
import { toast } from "sonner";

export default function ViewInspectionPage() {
  const params = useParams();
  const router = useRouter();
  const carId = params?.id?.toString();
  const inspectionId = params?.inspectionId?.toString();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInspection = async () => {
      if (!inspectionId) return;

      try {
        const response = await fetch(`/api/inspections/${inspectionId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch inspection");
        }
        const data = await response.json();
        setInspection(data.inspection);
      } catch (error) {
        console.error("Error fetching inspection:", error);
        toast.error("Failed to load inspection");
        router.push(`/cars/${carId}?tab=inspections`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInspection();
  }, [inspectionId, carId, router]);

  const handleEdit = () => {
    router.push(`/cars/${carId}/inspections/${inspectionId}/edit`);
  };

  const handleBack = () => {
    router.push(`/cars/${carId}?tab=inspections`);
  };

  const handleDelete = () => {
    router.push(`/cars/${carId}?tab=inspections`);
  };

  if (!carId || !inspectionId) {
    return null;
  }

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="flex flex-col min-h-screen bg-background">
          <div className="container-wide px-6 py-8">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!inspection) {
    return (
      <AuthGuard>
        <div className="flex flex-col min-h-screen bg-background">
          <div className="container-wide px-6 py-8">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Inspection not found</p>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-background">
        <div className="container-wide px-6 py-8">
          <InspectionReport
            inspection={inspection}
            onEdit={handleEdit}
            onBack={handleBack}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </AuthGuard>
  );
}
