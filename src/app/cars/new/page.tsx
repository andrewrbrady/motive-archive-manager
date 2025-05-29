"use client";

import React from "react";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import CarEntryForm, { CarEntryFormRef } from "@/components/cars/CarEntryForm";
import { Car } from "@/types/car";
import { PageTitle } from "@/components/ui/PageTitle";
import type { CarFormData } from "@/components/cars/CarEntryForm";
import { Button } from "@/components/ui/button";
import { FileJson } from "lucide-react";
import { toast } from "sonner";
import JsonUploadPasteModal from "@/components/common/JsonUploadPasteModal";

export default function NewCarPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showJsonUpload, setShowJsonUpload] = useState(false);
  const [isSubmittingJson, setIsSubmittingJson] = useState(false);
  const carFormRef = useRef<CarEntryFormRef>(null);

  const handleSubmit = async (formData: Partial<CarFormData>) => {
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/cars", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create car");
      }

      const data = await response.json();
      router.push(`/cars/${data._id}`);
    } catch (error) {
      console.error("Error creating car:", error);
      toast.error("Failed to create car. Please try again.");
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
            />
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
