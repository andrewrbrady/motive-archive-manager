import React, { useCallback } from "react";
import { useGalleryState, FilterOptions } from "@/hooks/useGalleryState";
import { ImageGalleryWithQuery } from "./ImageGalleryWithQuery";
import ImageUploadWithContext from "@/components/ImageUploadWithContext";
import { Check, Pencil } from "lucide-react";
import { ImageFilterButton } from "./ImageGalleryWithQuery";
import { toast } from "react-hot-toast";

interface GalleryContainerProps {
  carId: string;
  car: {
    _id: string;
    year: number;
    make: string;
    model: string;
    primaryImageId?: string;
  };
}

export const GalleryContainer: React.FC<GalleryContainerProps> = ({
  carId,
  car,
}) => {
  const { state, actions } = useGalleryState(carId);

  const handleModeToggle = async () => {
    const targetMode = state.mode === "editing" ? "viewing" : "editing";
    await actions.handleModeTransition(targetMode);
  };

  const handleImageUpload = useCallback(
    async (files: FileList) => {
      try {
        // Create FormData for each file
        const uploadPromises = Array.from(files).map((file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("carId", carId);

          return fetch("/api/cloudflare/images", {
            method: "POST",
            body: formData,
          }).then((res) => res.json());
        });

        // Upload files in batches of 3
        const results = [];
        for (let i = 0; i < uploadPromises.length; i += 3) {
          const batch = uploadPromises.slice(i, i + 3);
          const batchResults = await Promise.all(batch);
          results.push(...batchResults);
        }

        // Update gallery state
        await actions.synchronizeGalleryState();
        toast.success("Images uploaded successfully");
      } catch (error) {
        console.error("Error uploading images:", error);
        toast.error("Failed to upload images");
      }
    },
    [carId, actions]
  );

  const handleRemoveImage = useCallback(
    async (indices: number[], deleteFromStorage = false) => {
      try {
        if (deleteFromStorage) {
          const response = await fetch(`/api/cars/${carId}/images/batch`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              indices,
              deleteFromStorage,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to delete images");
          }
        }

        // Update gallery state
        await actions.synchronizeGalleryState();
        toast.success("Images removed successfully");
      } catch (error) {
        console.error("Error removing images:", error);
        toast.error("Failed to remove images");
      }
    },
    [carId, actions]
  );

  const handlePrimaryImageChange = useCallback(
    async (imageId: string) => {
      try {
        console.log(`Setting primary image ID to: ${imageId} for car ${carId}`);

        // Let the API handle the conversion to ObjectId
        const response = await fetch(`/api/cars/${carId}/thumbnail`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ primaryImageId: imageId }),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Failed to update primary image" }));
          throw new Error(errorData.error || "Failed to update primary image");
        }

        // Update the local state with the string ID (UI doesn't need ObjectId)
        actions.addPendingChange("primaryImageId", imageId);
        await actions.synchronizeGalleryState();
        toast.success("Primary image updated successfully");
      } catch (error) {
        console.error("Error updating primary image:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to update primary image"
        );
      }
    },
    [carId, actions]
  );

  const carsClientContext = {
    uploadImages: async (
      carId: string,
      files: File[],
      setProgress: (progress: any[]) => void
    ) => {
      try {
        setProgress(
          files.map((file) => ({
            fileName: file.name,
            progress: 0,
            status: "pending" as const,
            currentStep: "Starting upload...",
          }))
        );

        await handleImageUpload(files as unknown as FileList);
      } catch (error) {
        console.error("Error in uploadImages:", error);
      }
    },
    deleteImage: async (
      carId: string,
      imageId: string,
      setStatus: (status: any) => void
    ) => {
      try {
        setStatus({ status: "deleting" });
        await handleRemoveImage(
          [state.images.findIndex((img) => img.id === imageId)],
          true
        );
        setStatus({ status: "complete" });
      } catch (error) {
        console.error("Error in deleteImage:", error);
        setStatus({ status: "error", error: "Failed to delete image" });
      }
    },
  };

  const handleFilterChange = useCallback(
    (filterType: string, value: string) => {
      const newFilters = { ...state.filterState.activeFilters };
      if (newFilters[filterType] === value) {
        delete newFilters[filterType];
      } else {
        newFilters[filterType] = value;
      }
      actions.updateFilters(newFilters);
    },
    [state.filterState.activeFilters, actions]
  );

  // Helper function to generate car title that handles null values
  const generateCarTitle = () => {
    return [
      car.year ? car.year : null,
      car.make ? car.make : null,
      car.model ? car.model : null,
    ]
      .filter(Boolean)
      .join(" ");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          {state.mode === "viewing" && (
            <ImageFilterButton
              activeFilters={state.filterState.activeFilters}
              filterOptions={state.filterState.filterOptions}
              onFilterChange={handleFilterChange}
              onResetFilters={() => actions.updateFilters({})}
            />
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleModeToggle}
            disabled={state.isSyncing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-[hsl(var(--border))] rounded-md hover:bg-[hsl(var(--background))] bg-opacity-50 text-[hsl(var(--foreground-subtle))]"
          >
            {state.mode === "editing" ? (
              <>
                <Check className="w-4 h-4" />
                Done
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4" />
                Edit Gallery
              </>
            )}
          </button>
        </div>
      </div>

      <div className="image-gallery-wrapper mt-4 relative">
        <div
          className={`transition-opacity duration-300 ${
            state.isSyncing ? "opacity-60" : "opacity-100"
          }`}
        >
          {state.mode === "editing" ? (
            <ImageUploadWithContext
              carId={carId}
              images={state.images}
              primaryImageId={car.primaryImageId}
              onPrimaryImageChange={handlePrimaryImageChange}
              isEditMode={true}
              onRemoveImage={handleRemoveImage}
              onImagesChange={handleImageUpload}
              uploading={state.isSyncing}
              uploadProgress={[]}
              showMetadata={true}
              showFilters={true}
              title={generateCarTitle()}
              context={carsClientContext}
              onContextChange={() => {}}
              refreshImages={actions.synchronizeGalleryState}
            />
          ) : (
            <ImageGalleryWithQuery
              carId={carId}
              showFilters={true}
              vehicleInfo={{
                make: car.make || "",
                model: car.model || "",
                year: car.year || null,
              }}
              onFilterOptionsChange={(options: Record<string, string[]>) => {
                // Convert the Record to FilterOptions
                const filterOptions: FilterOptions = {
                  angles: options.angles || [],
                  movements: options.movements || [],
                  tods: options.tods || [],
                  views: options.views || [],
                  sides: options.sides || [],
                };
                actions.addPendingChange("filterOptions", filterOptions);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
