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
import { Upload, FileText } from "lucide-react";
import { toast } from "sonner";

export default function NewCarPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingJson, setIsUploadingJson] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      alert("Failed to create car. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJsonUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      toast.error("Please select a valid JSON file");
      return;
    }

    try {
      setIsUploadingJson(true);
      const fileContent = await file.text();
      const jsonData = JSON.parse(fileContent);

      // Validate that it has at least make and model
      if (!jsonData.make || !jsonData.model) {
        toast.error(
          "JSON file must contain at least 'make' and 'model' fields"
        );
        return;
      }

      // Populate the form with the JSON data
      if (carFormRef.current) {
        carFormRef.current.populateForm(jsonData);
        toast.success(
          `Form populated with data for ${jsonData.make} ${jsonData.model}`
        );
      } else {
        toast.error("Form not ready. Please try again.");
      }
    } catch (error) {
      console.error("Error processing JSON file:", error);
      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON format. Please check your file.");
      } else {
        toast.error(
          error instanceof Error ? error.message : "Failed to process JSON file"
        );
      }
    } finally {
      setIsUploadingJson(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
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
                  onClick={triggerFileUpload}
                  disabled={isUploadingJson}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {isUploadingJson ? (
                    <>
                      <Upload className="h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Upload JSON
                    </>
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleJsonUpload}
                  className="hidden"
                />
              </div>
            </div>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                JSON Upload Instructions
              </h3>
              <p className="text-sm text-blue-700">
                Upload a JSON file to automatically populate the form fields
                with car data. The JSON must contain at least{" "}
                <code className="bg-blue-100 px-1 rounded">make</code> and{" "}
                <code className="bg-blue-100 px-1 rounded">model</code> fields.
                You can review and edit the populated data before submitting.
              </p>
            </div>

            <CarEntryForm
              ref={carFormRef}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
