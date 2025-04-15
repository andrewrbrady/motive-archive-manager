"use client";

import { SimpleImageGallery } from "@/components/cars/SimpleImageGallery";
import Navbar from "@/components/layout/navbar";
import { useImages } from "@/hooks/use-images";
import { ImageData } from "@/app/images/columns";
import { useMemo } from "react";

export default function ImagesPage() {
  const { data, isLoading, error } = useImages({
    carId: "all",
    limit: 20,
  });

  // Map Image type to ImageData type
  const mappedImages = useMemo(() => {
    if (!data?.images) return undefined;

    return data.images.map((image) => ({
      _id: image.id,
      cloudflareId: image.id,
      url: image.url,
      filename: image.filename,
      width: 0, // Default values since these aren't in the Image type
      height: 0,
      metadata: image.metadata || {},
      carId: "",
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
    }));
  }, [data?.images]);

  return (
    <>
      <Navbar />
      <main className="container mx-auto py-10">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Image Gallery
            </h1>
            <p className="text-muted-foreground">
              Browse and manage your car images
            </p>
          </div>
          <SimpleImageGallery
            data={mappedImages}
            isLoading={isLoading}
            error={error || undefined}
          />
        </div>
      </main>
    </>
  );
}
