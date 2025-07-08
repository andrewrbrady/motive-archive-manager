"use client";

import React, { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  useGallery,
  updateGallery,
  deleteGallery,
  Gallery,
  updateGalleryImageOrder,
} from "@/lib/hooks/query/useGalleries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Code,
  DownloadCloud,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
// import Navbar from "@/components/layout/navbar";
import { GalleryImageSelector } from "@/components/galleries/GalleryImageSelector";
import { DraggableGalleryGrid } from "@/components/galleries/DraggableGalleryGrid";
import { ImageData } from "@/app/images/columns";
import { useQueryClient } from "@tanstack/react-query";
import { PageTitle } from "@/components/ui/PageTitle";
import JSZip from "jszip";
// import Footer from "@/components/layout/footer";

export default function GalleryPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id?.toString() || "";
  const { data: gallery, isLoading, error, mutate } = useGallery(id);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editedGallery, setEditedGallery] = useState({
    name: "",
    description: "",
  });
  const [isAddingImages, setIsAddingImages] = useState(false);

  // Clean up URL parameters when viewing gallery (these should only be used during image selection)
  React.useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const hasUrlParams =
      currentUrl.searchParams.has("page") ||
      currentUrl.searchParams.has("carId");

    // If we have pagination/filter params but we're not in adding mode, clean them up
    if (hasUrlParams && !isAddingImages) {
      currentUrl.searchParams.delete("page");
      currentUrl.searchParams.delete("carId");
      currentUrl.searchParams.delete("search");
      currentUrl.searchParams.delete("angle");
      currentUrl.searchParams.delete("movement");
      currentUrl.searchParams.delete("tod");
      currentUrl.searchParams.delete("view");
      window.history.replaceState({}, "", currentUrl.toString());
    }
  }, [isAddingImages]);
  const [isDownloading, setIsDownloading] = useState(false);
  const queryClient = useQueryClient();

  // Initialize form when gallery data is loaded
  React.useEffect(() => {
    if (gallery) {
      setEditedGallery({
        name: gallery.name,
        description: gallery.description || "",
      });
    }
  }, [gallery]);

  const handleSave = async () => {
    try {
      if (!gallery) {
        throw new Error("Gallery not found");
      }
      await updateGallery(id, {
        ...editedGallery,
        imageIds: gallery.imageIds,
      });
      setIsEditing(false);
      mutate();
      toast({
        title: "Success",
        description: "Gallery updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update gallery",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteGallery(id);
      router.push("/galleries");
      toast({
        title: "Success",
        description: "Gallery deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete gallery",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImageSelect = async (image: ImageData) => {
    if (!gallery) return;

    const imageId = image._id;
    const isRemoving = gallery.imageIds.includes(imageId);

    try {
      // Create optimistically updated gallery data
      const updatedImageIds = isRemoving
        ? gallery.imageIds.filter((id) => id !== imageId)
        : [...gallery.imageIds, imageId];

      const updatedOrderedImages = isRemoving
        ? (gallery.orderedImages || []).filter((item) => item.id !== imageId)
        : [
            ...(gallery.orderedImages ||
              gallery.imageIds.map((id, index) => ({ id, order: index }))),
            { id: imageId, order: gallery.imageIds.length },
          ];

      const updatedGallery = {
        ...gallery,
        imageIds: updatedImageIds,
        images: isRemoving
          ? (gallery.images || []).filter((img: any) => img._id !== imageId)
          : [...(gallery.images || []), image],
        orderedImages: updatedOrderedImages,
      };

      // Make the API call with ONLY the necessary updates to prevent data loss
      await updateGallery(id, {
        name: gallery.name,
        description: gallery.description,
        imageIds: updatedImageIds,
        orderedImages: updatedOrderedImages,
      });

      // Keep user on current page when adding images for better UX

      // Then update the local state
      if (!isRemoving) {
        setIsAddingImages(true); // Keep the selector open only when adding images
      }
      mutate(updatedGallery);

      toast({
        title: "Success",
        description: isRemoving
          ? "Image removed from gallery"
          : "Image added to gallery",
      });
    } catch (error) {
      // On error, revert to original state by revalidating
      mutate();

      toast({
        title: "Error",
        description: `Failed to ${isRemoving ? "remove" : "add"} image`,
        variant: "destructive",
      });
    }
  };

  const handleDoneAddingImages = () => {
    setIsAddingImages(false);
    // Clear all URL search params to return to clean gallery view
    router.push(`/galleries/${id}`, { scroll: false });
  };

  const handleOrderChange = async (updatedGallery: Gallery) => {
    if (!gallery) return;

    try {
      // Update UI optimistically first
      mutate(updatedGallery);

      // Make the API call
      await updateGalleryImageOrder(id, updatedGallery.orderedImages || []);

      // No need to mutate again on success since we already have the correct state
    } catch (error) {
      // Only refetch on error to get the correct state
      mutate();
      toast({
        title: "Error",
        description: "Failed to update image order",
        variant: "destructive",
      });
    }
  };

  const handleDownloadAllImages = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      // Force refresh the gallery data and wait for it
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔄 Fetching latest gallery data before download...");
      console.log("📊 Current gallery state:", {
        imageCount: gallery?.images?.length || 0,
        imageIds: gallery?.imageIds?.slice(0, 3) || [],
        firstFewFilenames:
          gallery?.images?.slice(0, 3).map((img: any) => img.filename) || [],
      });

      // Make a direct API call to get the absolute latest gallery data
      let currentGallery;
      try {
        const response = await fetch(`/api/galleries/${id}`);
        if (response.ok) {
          currentGallery = await response.json();
          console.log("✅ Fetched fresh gallery data via API:", {
            imageCount: currentGallery.images?.length || 0,
            imageIds: currentGallery.imageIds?.slice(0, 3) || [],
            firstFewFilenames:
              currentGallery.images
                ?.slice(0, 3)
                .map((img: any) => img.filename) || [],
            timestamp: new Date().toISOString(),
            debugInfo: currentGallery._debug,
          });

          // Compare with current state
          const isDataDifferent =
            (gallery?.images?.length || 0) !==
              (currentGallery.images?.length || 0) ||
            JSON.stringify(gallery?.imageIds?.slice(0, 5)) !==
              JSON.stringify(currentGallery.imageIds?.slice(0, 5));

          console.log("🔍 Data comparison:", {
            isDifferent: isDataDifferent,
            oldCount: gallery?.images?.length || 0,
            newCount: currentGallery.images?.length || 0,
          });
        } else {
          throw new Error("API call failed");
        }
      } catch (apiError) {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("API call failed, falling back to SWR mutate...");
        await mutate();
        // Wait a bit for revalidation to complete
        await new Promise((resolve) => setTimeout(resolve, 500));
        currentGallery = gallery;
      }

      if (
        !currentGallery ||
        !currentGallery.images ||
        currentGallery.images.length === 0
      ) {
        toast({
          title: "No Images",
          description: "There are no images in this gallery to download.",
          variant: "default",
        });
        return;
      }

      console.log("🔍 Download All Debug Info:", {
        galleryImages: currentGallery.images?.length || 0,
        galleryImageIds: currentGallery.imageIds?.length || 0,
        orderedImages: currentGallery.orderedImages?.length || 0,
        firstFewImages: currentGallery.images?.slice(0, 3).map((img: any) => ({
          id: img._id,
          filename: img.filename,
          url: img.url?.substring(0, 50) + "...",
        })),
      });

      toast({
        title: "Preparing Zip File",
        description: `Fetching and compressing ${currentGallery.images.length} images... This may take a moment.`,
      });

      const zip = new JSZip();
      const imageMap = new Map(
        currentGallery.images.map((img: any) => [img._id, img])
      );

      const orderedImageIds = currentGallery.orderedImages?.length
        ? currentGallery.orderedImages.map((item: any) => item.id)
        : currentGallery.imageIds;

      const imagesToProcess = orderedImageIds
        .map((id: any) => imageMap.get(id))
        .filter((img: any): img is ImageData => !!img);

      console.log("📦 Images to process:", {
        orderedImageIds: orderedImageIds?.length || 0,
        imagesToProcess: imagesToProcess.length,
        imageMap: imageMap.size,
      });

      // Log detailed image info to compare with UI
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔍 Detailed image processing order:");
      imagesToProcess.slice(0, 10).forEach((img: any, index: number) => {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`${index + 1}. ${img.filename} (${img._id})`, [data omitted]);
      });

      // Also log the first few from orderedImages for comparison
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🎯 Gallery ordered images (first 10):");
      if (currentGallery.orderedImages?.length) {
        currentGallery.orderedImages
          .sort((a: any, b: any) => a.order - b.order)
          .slice(0, 10)
          .forEach((item: any, index: number) => {
            const img: any = imageMap.get(item.id);
            console.log(
              `${index + 1}. Order ${item.order}: ${img?.filename || "NOT FOUND"} (${item.id})`
            );
          });
      } else {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("No orderedImages found, using imageIds order");
        currentGallery.imageIds
          .slice(0, 10)
          .forEach((id: string, index: number) => {
            const img: any = imageMap.get(id);
            console.log(
              `${index + 1}. ${img?.filename || "NOT FOUND"} (${id})`
            );
          });
      }

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < imagesToProcess.length; i++) {
        const image = imagesToProcess[i];
        // Fix the URL construction for Cloudflare Images
        let downloadUrl: string;

        if (image.url.includes("imagedelivery.net")) {
          // For Cloudflare Images, request original size at max quality
          const baseUrl = image.url
            .split("/public")[0]
            .split("/w=")[0]
            .split("/q=")[0];
          const urlParts = baseUrl.split("/");
          const accountHash = urlParts[3]; // imagedelivery.net/ACCOUNT_HASH/...
          const imageId = urlParts[4]; // imagedelivery.net/ACCOUNT_HASH/IMAGE_ID/...

          // Request original size at maximum quality - Cloudflare will serve the highest available
          downloadUrl = `https://imagedelivery.net/${accountHash}/${imageId}/q=100`;
        } else {
          // For other URLs, use as-is
          downloadUrl = image.url;
        }

        const filenameInZip =
          image.filename || `gallery-image-${image._id.slice(-6)}-${i + 1}.jpg`;

        try {
          console.log(
            `Downloading image ${i + 1}/${imagesToProcess.length}: ${filenameInZip}`
          );
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`  Original URL: ${image.url}`);
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`  Download URL: ${downloadUrl}`);

          const response = await fetch(downloadUrl);
          if (!response.ok) {
            throw new Error(
              `Failed to fetch ${filenameInZip}: ${response.statusText}`
            );
          }
          const blob = await response.blob();
          zip.file(filenameInZip, blob);
          successCount++;
        } catch (err) {
          errorCount++;
          console.error(`Failed to fetch or add ${filenameInZip} to zip:`, err);
          toast({
            title: "Image Error",
            description: `Skipping ${filenameInZip}. Check console for details.`,
            variant: "destructive",
          });
        }
      }

      if (successCount > 0) {
        try {
          const zipBlob = await zip.generateAsync({ type: "blob" });
          const zipFilename = `${currentGallery.name.replace(/\s+/g, "_") || "gallery"}_hq_images.zip`;

          const link = document.createElement("a");
          link.href = URL.createObjectURL(zipBlob);
          link.download = zipFilename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href); // Clean up the object URL

          toast({
            title: "Download Started",
            description: `Zipped ${successCount} of ${imagesToProcess.length} images. Download of '${zipFilename}' has started.`,
          });
          if (errorCount > 0) {
            toast({
              title: "Download Incomplete",
              description: `${errorCount} image(s) could not be processed. Check console for details.`,
              variant: "default", // Changed from "warning" as it's not a valid variant
            });
          }
        } catch (zipError) {
          console.error("Failed to generate or download zip:", zipError);
          toast({
            title: "Zip Generation Failed",
            description: "Could not create the zip file. Check console.",
            variant: "destructive",
          });
        }
      } else if (imagesToProcess.length > 0) {
        toast({
          title: "Zip Failed",
          description: "No images could be added to the zip file.",
          variant: "destructive",
        });
      }
      // No toast for "No images to download" here, as it's handled at the beginning.

      setIsDownloading(false);
    } catch (error) {
      console.error("Error downloading images:", error);
      toast({
        title: "Error",
        description: "Failed to download images. Check console for details.",
        variant: "destructive",
      });
      setIsDownloading(false);
    }
  };

  const handleImageProcessed = async (
    originalImageId: string,
    newImageData: any
  ) => {
    if (!gallery) return;

    console.log("🔄 handleImageProcessed called with:", {
      originalImageId,
      newImageData,
      currentGalleryImages: gallery.images?.length || 0,
    });

    try {
      // Create updated gallery with minimal changes - more efficient than full re-render
      const updatedGallery = {
        ...gallery,
        // Update the images array by replacing the original image with the processed one
        images: gallery.images?.map((image: any) => {
          if (image._id === originalImageId) {
            console.log("✅ Found image to replace:", {
              oldId: image._id,
              oldUrl: image.url,
              newId: newImageData._id,
              newUrl: newImageData.url,
            });
            // Replace with the complete new image data
            return {
              ...image, // Keep any existing fields as fallback
              ...newImageData, // Override with new processed image data
            };
          }
          return image;
        }),
        // Update imageIds array if the ID changed
        imageIds: gallery.imageIds.map((id: string) => {
          return id === originalImageId ? newImageData._id : id;
        }),
        // Update orderedImages array if it exists
        orderedImages: gallery.orderedImages?.map((item: any) => {
          if (item.id === originalImageId) {
            return { ...item, id: newImageData._id };
          }
          return item;
        }),
        updatedAt: new Date().toISOString(),
      };

      console.log("🎯 About to mutate with updated gallery:", {
        originalImagesCount: gallery.images?.length || 0,
        updatedImagesCount: updatedGallery.images?.length || 0,
      });

      // Try both optimistic update and force refresh
      mutate(updatedGallery); // Optimistic update

      // Also trigger a revalidation after a short delay to ensure fresh data
      setTimeout(() => {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔄 Triggering SWR revalidation...");
        mutate();
      }, 100);

      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ Gallery state updated successfully");

      // Show success message
      toast({
        title: "Success",
        description: "Image processed and saved to gallery successfully",
      });
    } catch (error) {
      console.error("❌ Error updating gallery:", error);

      // On error, revalidate to get fresh data
      mutate();

      toast({
        title: "Error",
        description: "Failed to update gallery display. Refreshing...",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* <Navbar /> */}
        <div className="container mx-auto px-4 py-8 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !gallery) {
    return (
      <div className="min-h-screen bg-background">
        {/* <Navbar /> */}
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-destructive">
            Error loading gallery
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* <Navbar /> */}
      <main className="container-wide px-6 py-8">
        <div className="space-y-6 sm:space-y-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/galleries")}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="flex-grow">
              {isEditing ? (
                <div className="space-y-4">
                  <Input
                    value={editedGallery.name}
                    onChange={(e) =>
                      setEditedGallery((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Gallery name"
                    className="text-lg font-medium"
                  />
                  <Textarea
                    value={editedGallery.description}
                    onChange={(e) =>
                      setEditedGallery((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Gallery description"
                  />
                </div>
              ) : (
                <div>
                  <h1 className="text-lg uppercase tracking-wide font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]">
                    {gallery.name}
                  </h1>
                  {gallery.description && (
                    <p className="text-muted-foreground mt-1">
                      {gallery.description}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <Button onClick={handleSave}>Save</Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    Edit Details
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive">Delete</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Gallery</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete this gallery? This
                          action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="destructive"
                          onClick={handleDelete}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Delete Gallery
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold tracking-tight">
                Gallery Images
              </h2>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Code className="h-4 w-4 mr-2" />
                      Generate YAML
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Gallery YAML</DialogTitle>
                      <DialogDescription>
                        Copy and paste this YAML into your configuration files.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="relative flex-1 min-h-0">
                      <pre className="p-4 bg-muted rounded-lg h-full overflow-y-auto">
                        <code className="text-sm block">
                          {`gallery:
${(() => {
  // Create a map of images by their ID for quick lookup
  const imageMap = new Map(
    gallery.images?.map((image) => [image._id, image]) || []
  );

  // Get ordered images array, falling back to default order if not available
  const orderedImageIds = gallery.orderedImages?.length
    ? gallery.orderedImages
        .sort((a, b) => a.order - b.order)
        .map((item) => item.id)
    : gallery.imageIds;

  // Map the ordered IDs to their corresponding images
  return orderedImageIds
    .map((id, index) => {
      const image = imageMap.get(id);
      if (!image) return null;
      return `  - id: "img${index + 1}"
    src: "${image.url}"
    alt: "${image.alt || image.filename || `Gallery Image ${index + 1}`}"`;
    })
    .filter(Boolean)
    .join("\n");
})()}`}
                        </code>
                      </pre>
                      <Button
                        className="absolute top-4 right-4"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            document.querySelector("pre code")?.textContent ||
                              ""
                          );
                          toast({
                            title: "Copied!",
                            description: "YAML code copied to clipboard",
                          });
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Code className="h-4 w-4 mr-2" />
                      Generate MDX
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>MDX Gallery Code</DialogTitle>
                      <DialogDescription>
                        Copy and paste this code into your MDX file to create a
                        gallery with lightbox functionality.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="relative flex-1 min-h-0">
                      <pre className="p-4 bg-muted rounded-lg h-full overflow-y-auto">
                        <code className="text-sm block">
                          {`<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  {(() => {
    const openModal = (id) => {
      const dialog = document.getElementById(id);
      dialog.showModal();

      const handleKeyPress = (e) => {
        if (e.key === 'ArrowRight') {
          navigateModal(id, 'next');
        } else if (e.key === 'ArrowLeft') {
          navigateModal(id, 'prev');
        }
      };

      dialog.addEventListener('keydown', handleKeyPress);
      dialog.addEventListener('close', () => {
        window.removeEventListener('keydown', handleKeyPress);
      });
    };

    const closeModal = (e) => {
      if (e.target.tagName.toLowerCase() === 'dialog' || e.target.classList.contains('close-btn')) {
        const dialog = e.target.closest('dialog');
        if (dialog) dialog.close();
      }
    };

    const images = [
${(() => {
  // Create a map of images by their ID for quick lookup
  const imageMap = new Map(
    gallery.images?.map((image) => [image._id, image]) || []
  );

  // Get ordered images array, falling back to default order if not available
  const orderedImageIds = gallery.orderedImages?.length
    ? gallery.orderedImages
        .sort((a, b) => a.order - b.order)
        .map((item) => item.id)
    : gallery.imageIds;

  // Map the ordered IDs to their corresponding images
  return orderedImageIds
    .map((id, index) => {
      const image = imageMap.get(id);
      if (!image) return null;
      return `      {
        id: 'lightbox${index + 1}',
        src: "${image.url}",
        alt: "${image.filename || `Gallery Image ${index + 1}`}"
      }`;
    })
    .filter(Boolean)
    .join(",\n");
})()}
    ];

    const navigateModal = (currentId, direction) => {
      const currentIndex = images.findIndex(img => img.id === currentId);
      let nextIndex;

      if (direction === 'next') {
        nextIndex = (currentIndex + 1) % images.length;
      } else {
        nextIndex = (currentIndex - 1 + images.length) % images.length;
      }

      document.getElementById(currentId).close();
      document.getElementById(images[nextIndex].id).showModal();
    };

    return (
      <>
        {images.map((image) => (
          <div key={image.id} className="aspect-w-16 aspect-h-12">
            <img
              src={image.src}
              alt={image.alt}
              className="w-full h-full object-cover rounded-lg cursor-pointer transition-opacity hover:opacity-90"
              onClick={() => openModal(image.id)}
            />
            <dialog
              id={image.id}
              className="fixed inset-0 w-full h-full p-0 bg-transparent"
              onClick={closeModal}
            >
              <div className="flex items-center justify-center min-h-screen p-4">
                <div className="relative max-w-7xl mx-auto">
                  <button
                    className="close-btn absolute -top-12 right-0 text-white text-xl font-bold p-4 z-50"
                    onClick={closeModal}
                  >
                    ×
                  </button>
                  <button
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 text-white text-4xl font-bold p-4 z-50 hover:bg-black/20 rounded-full"
                    onClick={() => navigateModal(image.id, 'prev')}
                  >
                    ‹
                  </button>
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="max-h-[85vh] max-w-[85vw] w-auto h-auto object-contain"
                  />
                  <button
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 text-white text-4xl font-bold p-4 z-50 hover:bg-black/20 rounded-full"
                    onClick={() => navigateModal(image.id, 'next')}
                  >
                    ›
                  </button>
                </div>
              </div>
            </dialog>
          </div>
        ))}
      </>
    );
  })()}
</div>

<style jsx>{\`
  dialog {
    width: 100vw;
    height: 100vh;
    max-width: 100vw;
    max-height: 100vh;
  }
  dialog::backdrop {
    background: rgba(0, 0, 0, 0.9);
  }
  dialog[open] {
    display: block;
  }
\`}</style>`}
                        </code>
                      </pre>
                      <Button
                        className="absolute top-4 right-4"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            document.querySelector("pre code")?.textContent ||
                              ""
                          );
                          toast({
                            title: "Copied!",
                            description: "MDX code copied to clipboard",
                          });
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Code className="h-4 w-4 mr-2" />
                      Generate Gallery Component
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Image Gallery Component Code</DialogTitle>
                      <DialogDescription>
                        Copy and paste this code into your MDX file to create a
                        gallery using the ImageGallery component.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="relative flex-1 min-h-0">
                      <pre className="p-4 bg-muted rounded-lg h-full overflow-y-auto">
                        <code className="text-sm block">
                          {`<ImageGallery
  images={[
${(() => {
  // Create a map of images by their ID for quick lookup
  const imageMap = new Map(
    gallery.images?.map((image) => [image._id, image]) || []
  );

  // Get ordered images array, falling back to default order if not available
  const orderedImageIds = gallery.orderedImages?.length
    ? gallery.orderedImages
        .sort((a, b) => a.order - b.order)
        .map((item) => item.id)
    : gallery.imageIds;

  // Map the ordered IDs to their corresponding images
  return orderedImageIds
    .map((id) => {
      const image = imageMap.get(id);
      if (!image) return null;
      return `    {
      id: "${image._id}",
      src: "${image.url}",
      alt: "${image.filename || "Gallery Image"}"
    }`;
    })
    .filter(Boolean)
    .join(",\n");
})()}
  ]}${
    gallery.images && gallery.images.length > 0
      ? `
  gridConfig={{ sm: 2, md: 3, lg: 3 }}
  maxRows={Math.ceil(${gallery.images.length} / 3)}`
      : ""
  }
/>`}
                        </code>
                      </pre>
                      <Button
                        className="absolute top-4 right-4"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            document.querySelector("pre code:last-child")
                              ?.textContent || ""
                          );
                          toast({
                            title: "Copied!",
                            description:
                              "Gallery component code copied to clipboard",
                          });
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Code className="h-4 w-4 mr-2" />
                      Generate Full Width Gallery
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>
                        Full Width Gallery Component Code
                      </DialogTitle>
                      <DialogDescription>
                        Copy and paste this code into your MDX file to create a
                        full-width gallery using the FullWidthGallery component.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="relative flex-1 min-h-0">
                      <pre className="p-4 bg-muted rounded-lg h-full overflow-y-auto">
                        <code className="text-sm block">
                          {`<FullWidthGallery
  images={[
${(() => {
  // Create a map of images by their ID for quick lookup
  const imageMap = new Map(
    gallery.images?.map((image) => [image._id, image]) || []
  );

  // Get ordered images array, falling back to default order if not available
  const orderedImageIds = gallery.orderedImages?.length
    ? gallery.orderedImages
        .sort((a, b) => a.order - b.order)
        .map((item) => item.id)
    : gallery.imageIds;

  // Map the ordered IDs to their corresponding images
  return orderedImageIds
    .map((id, index) => {
      const image = imageMap.get(id);
      if (!image) return null;
      return `    {
      id: "lightbox${index + 1}",
      src: "${image.url}",
      alt: "${image.filename || "Gallery Image"}"
    }`;
    })
    .filter(Boolean)
    .join(",\n");
})()}
  ]}
  cols={{ sm: 1, md: 3, lg: 3 }}
/>`}
                        </code>
                      </pre>
                      <Button
                        className="absolute top-4 right-4"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            document.querySelector("pre code:last-child")
                              ?.textContent || ""
                          );
                          toast({
                            title: "Copied!",
                            description:
                              "Full width gallery code copied to clipboard",
                          });
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  onClick={handleDownloadAllImages}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <DownloadCloud className="h-4 w-4 mr-2" />
                  )}
                  {isDownloading ? "Downloading..." : "Download All"}
                </Button>

                <Button
                  onClick={() => {
                    if (isAddingImages) {
                      handleDoneAddingImages();
                    } else {
                      setIsAddingImages(true);
                    }
                  }}
                  variant={isAddingImages ? "secondary" : "default"}
                >
                  {isAddingImages ? (
                    "Done"
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Images
                    </>
                  )}
                </Button>
              </div>
            </div>

            {isAddingImages ? (
              /* 
                GalleryImageSelector: Used for selecting images to add to the gallery.
                URL parameters (page, carId, search, etc.) control pagination and filtering 
                of available images to select from.
              */
              <GalleryImageSelector
                selectedImageIds={gallery.imageIds}
                onImageSelect={handleImageSelect}
              />
            ) : gallery.images && gallery.images.length > 0 ? (
              /* 
                DraggableGalleryGrid: Displays ALL images in the gallery without pagination.
                Images can be reordered via drag & drop. The URL should not have pagination 
                parameters when viewing this component.
              */
              <DraggableGalleryGrid
                gallery={gallery}
                onOrderChange={handleOrderChange}
                onImageSelect={handleImageSelect}
                onImageProcessed={handleImageProcessed}
              />
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No images in this gallery
              </div>
            )}
          </div>
        </div>
      </main>
      {/* <Footer /> */}
    </div>
  );
}
