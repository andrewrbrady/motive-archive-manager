"use client";

import { SimpleImageGallery } from "@/components/cars/SimpleImageGallery";
import Navbar from "@/components/layout/navbar";
import { useImages } from "@/hooks/use-images";

export default function ImagesPage() {
  const { data, isLoading, error } = useImages({
    carId: "all",
    limit: 20,
  });

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
            data={data?.images}
            isLoading={isLoading}
            error={error || undefined}
          />
        </div>
      </main>
    </>
  );
}
