// Example: Migrating from old copywriting components to new refactored ones

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileJson } from "lucide-react";
import { toast } from "sonner";
import type { Project } from "@/types/project";

// ===== BEFORE REFACTOR =====

// Old car copywriting usage
import { CarCopywriter as OldCarCopywriter } from "@/components/cars/CarCopywriter";
import JsonUploadPasteModal from "@/components/common/JsonUploadPasteModal";

function OldCarPage({ carId }: { carId: string }) {
  const [showJsonUpload, setShowJsonUpload] = useState(false);
  const [isSubmittingJson, setIsSubmittingJson] = useState(false);

  const handleJsonSubmit = async (jsonData: any[]) => {
    try {
      setIsSubmittingJson(true);
      // Custom JSON handling logic...
      const carData = jsonData[0];
      // Populate form logic...
      toast.success("Form populated successfully");
    } catch (error) {
      toast.error("Failed to process JSON");
    } finally {
      setIsSubmittingJson(false);
    }
  };

  return (
    <div>
      <div className="flex gap-4 mb-6">
        <Button onClick={() => setShowJsonUpload(true)}>
          <FileJson className="h-4 w-4 mr-2" />
          Import JSON
        </Button>
      </div>

      <OldCarCopywriter carId={carId} />

      <JsonUploadPasteModal
        isOpen={showJsonUpload}
        onClose={() => setShowJsonUpload(false)}
        onSubmit={handleJsonSubmit}
        title="Import Car Data from JSON"
        description="Upload a JSON file or paste a JSON object to populate the car form."
        expectedType="cars"
        isSubmitting={isSubmittingJson}
      />
    </div>
  );
}

// Old project copywriting usage
import { ProjectCopywriter as OldProjectCopywriter } from "@/components/projects/ProjectCopywriter";

function OldProjectPage({ project }: { project: Project }) {
  const handleUpdate = () => {
    // Project update logic
  };

  return (
    <OldProjectCopywriter project={project} onProjectUpdate={handleUpdate} />
  );
}

// ===== AFTER REFACTOR =====

// New car copywriting usage
import { CarCopywriter } from "@/components/copywriting";
import { CarJsonImport } from "@/components/common/JsonImportUtility";

function NewCarPage({ carId }: { carId: string }) {
  const handleCarImport = async (jsonData: any[]) => {
    const carData = jsonData[0];
    // Populate form logic...
    // Error handling is built into the utility
  };

  return (
    <div>
      <div className="flex gap-4 mb-6">
        <CarJsonImport
          onImport={handleCarImport}
          carData={{ make: "Toyota", model: "Camry" }} // Optional context
        />
      </div>

      <CarCopywriter carId={carId} />
    </div>
  );
}

// New project copywriting usage
import { ProjectCopywriter } from "@/components/copywriting";

function NewProjectPage({ project }: { project: Project }) {
  const handleUpdate = () => {
    // Project update logic
  };

  return <ProjectCopywriter project={project} onProjectUpdate={handleUpdate} />;
}

// ===== BENEFITS OF NEW APPROACH =====

// 1. Less boilerplate code
// 2. Consistent error handling
// 3. Reusable JSON import functionality
// 4. Better type safety
// 5. Cleaner imports

// ===== EXTENDING FOR NEW USE CASES =====

// Example: Creating a gallery copywriter
import {
  BaseCopywriter,
  CopywriterConfig,
  CopywriterCallbacks,
} from "@/components/copywriting";

function GalleryCopywriter({ galleryId }: { galleryId: string }) {
  const fetchSystemPrompts = async () => {
    const response = await fetch("/api/system-prompts/active");
    return response.json();
  };

  const fetchLengthSettings = async () => {
    const response = await fetch("/api/admin/length-settings");
    return response.json();
  };

  const config: CopywriterConfig = {
    mode: "gallery" as any, // Would need to extend the type
    entityId: galleryId,
    title: "Gallery Copywriter",
    apiEndpoints: {
      captions: `/api/galleries/${galleryId}/captions`,
      systemPrompts: `/api/system-prompts/active`,
    },
    features: {
      allowMultipleCars: true,
      allowEventSelection: false,
      allowMinimalCarData: false,
      showClientHandle: false,
    },
  };

  const callbacks: CopywriterCallbacks = {
    onDataFetch: async () => {
      // Fetch gallery-specific data
      const galleryResponse = await fetch(`/api/galleries/${galleryId}`);
      const gallery = await galleryResponse.json();

      // Convert to expected format
      return {
        cars: gallery.cars || [],
        models: [], // No models for gallery mode
        events: [],
        systemPrompts: await fetchSystemPrompts(),
        lengthSettings: await fetchLengthSettings(),
        savedCaptions: gallery.captions || [],
        clientHandle: null,
      };
    },

    onSaveCaption: async (captionData) => {
      const response = await fetch(`/api/galleries/${galleryId}/captions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(captionData),
      });
      return response.ok;
    },

    onDeleteCaption: async (captionId) => {
      const response = await fetch(
        `/api/galleries/${galleryId}/captions/${captionId}`,
        {
          method: "DELETE",
        }
      );
      return response.ok;
    },

    onUpdateCaption: async (captionId, newText) => {
      const response = await fetch(
        `/api/galleries/${galleryId}/captions/${captionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caption: newText }),
        }
      );
      return response.ok;
    },

    onRefresh: async () => {
      // Refresh gallery data
    },
  };

  return <BaseCopywriter config={config} callbacks={callbacks} />;
}

// Example: Using different JSON import utilities
import {
  EventsJsonImport,
  DeliverablesJsonImport,
  SpecificationsJsonImport,
} from "@/components/common/JsonImportUtility";

function ExampleUsages() {
  const handleEventsImport = async (data: any[]) => {
    // Handle events import
  };

  const handleDeliverablesImport = async (data: any[]) => {
    // Handle deliverables import
  };

  const handleSpecsImport = async (data: any[]) => {
    // Handle specifications import
  };

  const canImport = true; // Some condition

  return (
    <div className="space-y-4">
      {/* Batch import events */}
      <EventsJsonImport onImport={handleEventsImport} className="w-full" />

      {/* Batch import deliverables */}
      <DeliverablesJsonImport
        onImport={handleDeliverablesImport}
        disabled={!canImport}
      />

      {/* Import car specifications */}
      <SpecificationsJsonImport
        onImport={handleSpecsImport}
        carData={{ make: "BMW", model: "M3", year: 2023 }}
      />
    </div>
  );
}
