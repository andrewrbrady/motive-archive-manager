"use client";

import React, { useState, useEffect } from "react";
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
import InspectionForm from "./InspectionForm";
import InspectionList from "./InspectionList";
import InspectionReport from "./InspectionReport";

interface InspectionTabProps {
  carId: string;
}

type View = "list" | "create" | "edit" | "view";

export default function InspectionTab({ carId }: InspectionTabProps) {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>("list");
  const [selectedInspection, setSelectedInspection] =
    useState<Inspection | null>(null);

  // Fetch inspections for this car
  const fetchInspections = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/cars/${carId}/inspections`);

      if (!response.ok) {
        throw new Error("Failed to fetch inspections");
      }

      const data = await response.json();
      setInspections(data.inspections || []);
    } catch (error) {
      console.error("Error fetching inspections:", error);
      toast.error("Failed to load inspections");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (carId) {
      fetchInspections();
    }
  }, [carId]);

  const handleCreateInspection = () => {
    setSelectedInspection(null);
    setCurrentView("create");
  };

  const handleEditInspection = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setCurrentView("edit");
  };

  const handleViewInspection = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setCurrentView("view");
  };

  const handleInspectionSaved = () => {
    fetchInspections();
    setCurrentView("list");
    setSelectedInspection(null);
    toast.success("Inspection saved successfully");
  };

  const handleInspectionDeleted = () => {
    fetchInspections();
    setCurrentView("list");
    setSelectedInspection(null);
    toast.success("Inspection deleted successfully");
  };

  const handleBackToList = () => {
    setCurrentView("list");
    setSelectedInspection(null);
  };

  // Summary stats
  const passedInspections = inspections.filter(
    (i) => i.status === "pass"
  ).length;
  const failedInspections = inspections.filter(
    (i) => i.status === "needs_attention"
  ).length;
  const totalInspections = inspections.length;

  if (currentView === "create" || currentView === "edit") {
    return (
      <InspectionForm
        carId={carId}
        inspection={selectedInspection}
        onSave={handleInspectionSaved}
        onCancel={handleBackToList}
      />
    );
  }

  if (currentView === "view" && selectedInspection) {
    return (
      <InspectionReport
        inspection={selectedInspection}
        onEdit={() => handleEditInspection(selectedInspection)}
        onBack={handleBackToList}
        onDelete={handleInspectionDeleted}
      />
    );
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
            <CardContent>
              <div className="text-2xl font-bold">{totalInspections}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Passed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
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
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {failedInspections}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : totalInspections === 0 ? (
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
