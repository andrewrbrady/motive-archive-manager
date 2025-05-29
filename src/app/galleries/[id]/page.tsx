"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  const id = params?.id?.toString() || "";
  const { data: gallery, isLoading, error, mutate } = useGallery(id);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editedGallery, setEditedGallery] = useState({
    name: "",
    description: "",
  });
  const [isAddingImages, setIsAddingImages] = useState(false);
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
      const updatedGallery = {
        ...gallery,
        imageIds: isRemoving
          ? gallery.imageIds.filter((id) => id !== imageId)
          : [...gallery.imageIds, imageId],
        images: isRemoving
          ? (gallery.images || []).filter((img: any) => img._id !== imageId)
          : [...(gallery.images || []), image],
        orderedImages: isRemoving
          ? (gallery.orderedImages || []).filter((item) => item.id !== imageId)
          : [
              ...(gallery.orderedImages ||
                gallery.imageIds.map((id, index) => ({ id, order: index }))),
              { id: imageId, order: gallery.imageIds.length },
            ],
      };

      // Make the API call first
      await updateGallery(id, {
        ...gallery,
        imageIds: updatedGallery.imageIds,
        orderedImages: updatedGallery.orderedImages,
      });

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
    // Just clear URL search params without triggering additional refreshes
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
    if (!gallery || !gallery.images || gallery.images.length === 0) {
      toast({
        title: "No Images",
        description: "There are no images in this gallery to download.",
        variant: "default",
      });
      return;
    }

    if (isDownloading) return;
    setIsDownloading(true);

    toast({
      title: "Preparing Zip File",
      description: `Fetching and compressing images... This may take a moment.`,
    });

    const zip = new JSZip();
    const imageMap = new Map(
      gallery.images.map((img: ImageData) => [img._id, img])
    );

    const orderedImageIds = gallery.orderedImages?.length
      ? gallery.orderedImages
          .sort((a, b) => a.order - b.order)
          .map((item) => item.id)
      : gallery.imageIds;

    const imagesToProcess = orderedImageIds
      .map((id) => imageMap.get(id))
      .filter((img): img is ImageData => !!img);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < imagesToProcess.length; i++) {
      const image = imagesToProcess[i];
      // Corrected URL format: append parameters directly to the image.url
      const downloadUrl = `${image.url}w=3000,q=100`;
      const filenameInZip =
        image.filename || `gallery-image-${image._id.slice(-6)}-${i + 1}.jpg`;

      try {
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
        const zipFilename = `${gallery.name.replace(/\s+/g, "_") || "gallery"}_hq_images.zip`;

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
  };

  const handleImageProcessed = async (
    originalImageId: string,
    newImageData: any
  ) => {
    if (!gallery) return;

    console.log("🔄 handleImageProcessed called:", {
      originalImageId,
      newImageData,
      currentGallery: gallery,
    });

    // Update the local gallery state by creating a new gallery object
    const updatedGallery = {
      ...gallery,
      // Update the images array by replacing the original image with the processed one
      images: gallery.images?.map((image: any) => {
        if (image._id === originalImageId) {
          console.log("✅ Found image to replace:", image);
          console.log("📝 Replacing with:", newImageData);
          // Replace with the complete new image data and add cache-busting
          return {
            ...image, // Keep any existing fields as fallback
            ...newImageData, // Override with new processed image data
            url: `${newImageData.url}?v=${newImageData._id}`, // Add cache-busting to force refresh
          };
        }
        return image;
      }),
      // Update imageIds array if the ID changed
      imageIds: gallery.imageIds.map((id: string) => {
        const newId = id === originalImageId ? newImageData._id : id;
        if (id === originalImageId) {
          console.log(`📋 Updated imageId: ${id} → ${newId}`);
        }
        return newId;
      }),
      // Update orderedImages array if it exists
      orderedImages: gallery.orderedImages?.map((item: any) => {
        if (item.id === originalImageId) {
          console.log(
            `📋 Updated orderedImage: ${item.id} → ${newImageData._id}`
          );
          return { ...item, id: newImageData._id };
        }
        return item;
      }),
      updatedAt: new Date().toISOString(),
    };

    console.log("🎯 Final updated gallery:", updatedGallery);

    // Update the SWR cache with the new data immediately
    await mutate(updatedGallery);

    // After a short delay, revalidate to ensure we have the latest data
    setTimeout(() => {
      console.log("🔄 Revalidating gallery data...");
      mutate();
    }, 1000);

    toast({
      title: "Success",
      description: "Image processed and saved to gallery successfully",
    });
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
              <GalleryImageSelector
                selectedImageIds={gallery.imageIds}
                onImageSelect={handleImageSelect}
              />
            ) : gallery.images && gallery.images.length > 0 ? (
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
