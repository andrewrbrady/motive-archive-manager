"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import CarEntryForm, { CarEntryFormRef } from "@/components/cars/CarEntryForm";
import { PageTitle } from "@/components/ui/PageTitle";
import type { CarFormData } from "@/components/cars/CarEntryForm";
import { Button } from "@/components/ui/button";
import { FileJson } from "lucide-react";
import { toast } from "sonner";
import JsonUploadPasteModal from "@/components/common/JsonUploadPasteModal";
import { useAPI } from "@/hooks/useAPI";
import Navbar from "@/components/layout/navbar";

export default function NewCarPage() {
  const router = useRouter();
  const api = useAPI();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showJsonUpload, setShowJsonUpload] = useState(false);
  const [isSubmittingJson, setIsSubmittingJson] = useState(false);
  const carFormRef = useRef<CarEntryFormRef>(null);

  const handleSubmit = async (carData: Partial<CarFormData>) => {
    if (!api) {
      toast.error("Authentication required to create cars");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/cars", carData);
      toast.success("Car created successfully!");
      router.push("/cars");
    } catch (error: any) {
      console.error("Error creating car:", error);
      toast.error(error.message || "Failed to create car");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJsonSubmit = async (jsonData: any[]) => {
    try {
      setIsSubmittingJson(true);

      // The modal guarantees jsonData is an array with exactly one car object for cars
      const carData = jsonData[0];

      // Populate the form with the JSON data
      if (carFormRef.current) {
        carFormRef.current.populateForm(carData);
        toast.success(
          `Form populated with data for ${carData.make} ${carData.model}`
        );
      } else {
        throw new Error("Form not ready. Please try again.");
      }
    } catch (error) {
      console.error("Error processing JSON:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to process JSON data"
      );
      throw error; // Re-throw to prevent modal from closing
    } finally {
      setIsSubmittingJson(false);
    }
  };

  if (!api) {
    return (
      <div>
        <Navbar />
        <div className="container mx-auto py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Authentication Required</h1>
            <p className="text-muted-foreground">
              Please log in to create cars
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <PageTitle title="Add New Car" />
              <div className="flex gap-4">
                <Button
                  onClick={() => setShowJsonUpload(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileJson className="h-4 w-4" />
                  Import JSON
                </Button>
              </div>
            </div>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                JSON Import Instructions
              </h3>
              <p className="text-sm text-blue-700">
                Upload a JSON file or paste a JSON object to automatically
                populate the form fields with car data. The JSON must contain at
                least <code className="bg-blue-100 px-1 rounded">make</code> and{" "}
                <code className="bg-blue-100 px-1 rounded">model</code> fields.
                You can review and edit the populated data before submitting.
              </p>
            </div>

            <CarEntryForm
              ref={carFormRef}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />

            <JsonUploadPasteModal
              isOpen={showJsonUpload}
              onClose={() => setShowJsonUpload(false)}
              onSubmit={handleJsonSubmit}
              title="Import Car Data from JSON"
              description="Upload a JSON file or paste a JSON object to populate the car form with existing data."
              expectedType="cars"
              isSubmitting={isSubmittingJson}
              carData={
                {
                  // Pass any existing form data for AI context
                  // This could be enhanced to get actual form values
                }
              }
            />
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
