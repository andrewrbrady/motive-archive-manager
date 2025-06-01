"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  FileText,
  Mail,
  Calendar,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Inspection } from "@/types/inspection";
import { toast } from "sonner";
import InspectionList from "./InspectionList";
import { useAPI } from "@/hooks/useAPI";
import { InspectionSkeleton } from "./optimized/inspections";

interface InspectionTabProps {
  carId: string;
}

export default function InspectionTab({ carId }: InspectionTabProps) {
  const router = useRouter();
  const api = useAPI();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch inspections for this car
  const fetchInspections = async () => {
    if (!api) return;

    try {
      setIsLoading(true);
      const data = (await api.get(`cars/${carId}/inspections`)) as {
        inspections?: Inspection[];
      };
      setInspections(data.inspections || []);
    } catch (error) {
      console.error("Error fetching inspections:", error);
      toast.error("Failed to load inspections");
      setInspections([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (carId && api) {
      fetchInspections();
    }
  }, [carId, api]);

  const handleCreateInspection = () => {
    // Navigate to the new inspection page
    router.push(`/cars/${carId}/inspections/new`);
  };

  const handleEditInspection = (inspection: Inspection) => {
    // Navigate to the edit inspection page
    router.push(`/cars/${carId}/inspections/${inspection._id}/edit`);
  };

  const handleViewInspection = (inspection: Inspection) => {
    // Navigate to the view inspection page
    router.push(`/cars/${carId}/inspections/${inspection._id}`);
  };

  // Summary stats
  const passedInspections = inspections.filter(
    (i) => i.status === "pass"
  ).length;
  const failedInspections = inspections.filter(
    (i) => i.status === "needs_attention"
  ).length;
  const totalInspections = inspections.length;

  // Show skeleton loading state
  if (isLoading) {
    return <InspectionSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Vehicle Inspections
          </h2>
          <p className="text-muted-foreground">
            Manage and track inspection reports for this vehicle
          </p>
        </div>
        <Button
          onClick={handleCreateInspection}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Inspection
        </Button>
      </div>

      {/* Stats Cards */}
      {totalInspections > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Inspections
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-4 pt-2">
              <div className="text-2xl font-bold flex items-center justify-start h-8">
                {totalInspections}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Passed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent className="pb-4 pt-2">
              <div className="text-2xl font-bold text-green-600 flex items-center justify-start h-8">
                {passedInspections}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Needs Attention
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent className="pb-4 pt-2">
              <div className="text-2xl font-bold text-red-600 flex items-center justify-start h-8">
                {failedInspections}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      {totalInspections === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No inspections yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first inspection report to track the condition and
              maintenance of this vehicle.
            </p>
            <Button
              onClick={handleCreateInspection}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create First Inspection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <InspectionList
          inspections={inspections}
          onView={handleViewInspection}
          onEdit={handleEditInspection}
          onRefresh={fetchInspections}
        />
      )}
    </div>
  );
}
