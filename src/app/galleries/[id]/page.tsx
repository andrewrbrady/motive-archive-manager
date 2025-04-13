"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useGallery,
  updateGallery,
  deleteGallery,
} from "@/lib/hooks/query/useGalleries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, Save, ArrowLeft, Code } from "lucide-react";
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
import Navbar from "@/components/layout/navbar";
import { GalleryImageSelector } from "@/components/galleries/GalleryImageSelector";
import { DraggableGalleryGrid } from "@/components/galleries/DraggableGalleryGrid";
import { ImageData } from "@/app/images/columns";
import { useQueryClient } from "@tanstack/react-query";

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

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto py-10">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </>
    );
  }

  if (error || !gallery) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto py-10">
          <div className="text-center text-destructive">
            Error loading gallery
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container mx-auto py-10">
        <div className="space-y-6">
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
                    className="text-2xl font-semibold"
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
                  <h1 className="text-3xl font-semibold tracking-tight">
                    {gallery.name}
                  </h1>
                  {gallery.description && (
                    <p className="text-muted-foreground mt-2">
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
${gallery.images
  ?.map(
    (image: any, index: number) => `      {
        id: 'lightbox${index + 1}',
        src: "${image.url}",
        alt: "${image.filename || `Gallery Image ${index + 1}`}"
      }`
  )
  .join(",\n")}
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
                onOrderChange={() => mutate()}
                onImageSelect={handleImageSelect}
              />
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No images in this gallery
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
