"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useGalleries, createGallery } from "@/lib/hooks/query/useGalleries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, ImageIcon } from "lucide-react";
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
import LazyImage from "@/components/LazyImage";

export default function GalleriesPage() {
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const { data, isLoading, error, mutate } = useGalleries({
    search: searchInput,
  });

  const [newGallery, setNewGallery] = useState({
    name: "",
    description: "",
  });

  const handleCreateGallery = async () => {
    try {
      setIsCreating(true);
      await createGallery(newGallery);
      setIsCreateDialogOpen(false);
      setNewGallery({ name: "", description: "" });
      mutate();
      toast({
        title: "Success",
        description: "Gallery created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create gallery",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto py-10 h-full">
          <div className="space-y-6 h-full">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  Galleries
                </h1>
                <p className="text-muted-foreground">
                  Create and manage your image galleries
                </p>
              </div>

              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Gallery
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Create New Gallery</DialogTitle>
                    <DialogDescription>
                      Create a new gallery to organize your images
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={newGallery.name}
                        onChange={(e) =>
                          setNewGallery((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder="Enter gallery name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newGallery.description}
                        onChange={(e) =>
                          setNewGallery((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Enter gallery description"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateGallery}
                      disabled={!newGallery.name || isCreating}
                    >
                      {isCreating && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Gallery
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex items-center space-x-4">
              <Input
                placeholder="Search galleries..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center text-destructive">
                Error loading galleries
              </div>
            ) : data?.galleries.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No galleries found
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data?.galleries.map((gallery, index) => (
                  <div
                    key={gallery._id}
                    className="group relative bg-card rounded-lg border p-6 hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/galleries/${gallery._id}`)}
                  >
                    <div className="relative aspect-[16/9] mb-4 overflow-hidden rounded-md bg-muted">
                      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm border border-border text-foreground shadow-sm">
                        <ImageIcon className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">
                          {gallery.imageIds.length}
                        </span>
                      </div>

                      {gallery.thumbnailImage ? (
                        <LazyImage
                          src={gallery.thumbnailImage.url}
                          alt={gallery.name}
                          width={1600}
                          height={900}
                          className="w-full h-full"
                          priority={index < 3}
                          objectFit="cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <div className="text-muted-foreground">No images</div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold tracking-tight">
                        {gallery.name}
                      </h2>
                      {gallery.description && (
                        <p className="text-muted-foreground line-clamp-2">
                          {gallery.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
