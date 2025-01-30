"use client";

import React from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/navbar";
import { ImageGallery } from "@/components/ImageGallery";
import { VehicleDetails } from "@/components/inventory/VehicleDetails";
import { InventoryItem } from "@/components/inventory/types";

export default function InventoryItemPage() {
  const params = useParams();
  const [item, setItem] = React.useState<InventoryItem | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchItem = async () => {
      try {
        const response = await fetch(`/api/inventory/${params.id}`);
        const data = await response.json();
        setItem(data);
      } catch (error) {
        console.error("Error fetching inventory item:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchItem();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex justify-center items-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold">Item not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <ImageGallery
            images={(item.images || []).map((url) => ({
              id: url,
              url,
              filename: url.split("/").pop() || "",
              metadata: {},
              variants: {},
              createdAt: item.timestamp || new Date().toISOString(),
              updatedAt: item.timestamp || new Date().toISOString(),
            }))}
            title={`${item.year} ${item.make} ${item.model}`}
            aspectRatio="4/3"
            isEditMode={false}
            onRemoveImage={() => {}}
            onImagesChange={() => {}}
            uploading={false}
            uploadProgress={[]}
            carId={item.id}
            showMetadata={false}
            showFilters={false}
          />
          <div className="mt-8">
            <VehicleDetails item={item} showExternalLink={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
