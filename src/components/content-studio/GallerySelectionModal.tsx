"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Images, Link, Loader2, Upload, FileImage } from "lucide-react";
import { CloudflareImage } from "@/components/ui/CloudflareImage";

interface Gallery {
  _id: string;
  name: string;
  description?: string;
  imageIds: string[];
  imageCount: number;
  thumbnailImage?: {
    _id: string;
    url: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface GallerySelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectGalleries: Gallery[];
  availableGalleries: Gallery[];
  selectedFiles: File[];
  onUploadToGallery: (galleryId: string) => Promise<void>;
  onCreateAndUpload: (data: {
    name: string;
    description: string;
  }) => Promise<void>;
  onLinkAndUpload: (galleryId: string) => Promise<void>;
  isUploading: boolean;
}

export function GallerySelectionModal({
  open,
  onOpenChange,
  projectGalleries,
  availableGalleries,
  selectedFiles,
  onUploadToGallery,
  onCreateAndUpload,
  onLinkAndUpload,
  isUploading,
}: GallerySelectionModalProps) {
  const [newGallery, setNewGallery] = useState({
    name: "",
    description: "",
  });
  const [selectedGalleryId, setSelectedGalleryId] = useState<string>("");
  const [selectedAvailableGalleryId, setSelectedAvailableGalleryId] =
    useState<string>("");

  const handleCreateGallery = async () => {
    if (!newGallery.name.trim()) return;

    await onCreateAndUpload(newGallery);
    setNewGallery({ name: "", description: "" });
  };

  const handleUploadToExisting = async () => {
    if (!selectedGalleryId) return;
    await onUploadToGallery(selectedGalleryId);
  };

  const handleLinkAndUpload = async () => {
    if (!selectedAvailableGalleryId) return;
    await onLinkAndUpload(selectedAvailableGalleryId);
  };

  const formatFileList = () => {
    if (selectedFiles.length === 0) return "No files selected";
    if (selectedFiles.length === 1) return selectedFiles[0].name;
    return `${selectedFiles.length} files selected`;
  };

  const renderGalleryCard = (
    gallery: Gallery,
    isSelected: boolean,
    onSelect: () => void
  ) => (
    <Card
      key={gallery._id}
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "ring-2 ring-blue-500" : ""
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium truncate">
            {gallery.name}
          </CardTitle>
          <Badge variant="secondary" className="ml-2 text-xs">
            {gallery.imageCount} {gallery.imageCount === 1 ? "image" : "images"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {gallery.thumbnailImage ? (
            <div className="relative w-full h-20 bg-gray-100 rounded-md overflow-hidden">
              <CloudflareImage
                src={gallery.thumbnailImage.url}
                alt={gallery.name}
                fill
                className="object-cover"
                variant="thumbnail"
              />
            </div>
          ) : (
            <div className="w-full h-20 bg-gray-100 rounded-md flex items-center justify-center">
              <Images className="w-6 h-6 text-gray-400" />
            </div>
          )}
          {gallery.description && (
            <p className="text-xs text-gray-600 line-clamp-2">
              {gallery.description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Images to Gallery
          </DialogTitle>
          <DialogDescription>
            Choose how to handle your image upload: {formatFileList()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
          <FileImage className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-700">
            Files will be uploaded with AI analysis and optimized for web
            delivery
          </span>
        </div>

        <Tabs
          defaultValue={projectGalleries.length > 0 ? "existing" : "create"}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger
              value="existing"
              disabled={projectGalleries.length === 0}
            >
              Existing Galleries ({projectGalleries.length})
            </TabsTrigger>
            <TabsTrigger value="create">Create New Gallery</TabsTrigger>
            <TabsTrigger
              value="link"
              disabled={availableGalleries.length === 0}
            >
              Link Gallery ({availableGalleries.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4">
            {projectGalleries.length === 0 ? (
              <div className="text-center py-8">
                <Images className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  No galleries linked to this project yet.
                </p>
                <p className="text-sm text-gray-500">
                  Create a new gallery or link an existing one.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  Select a gallery that's already linked to this project:
                </p>
                <ScrollArea className="h-64">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {projectGalleries.map((gallery) =>
                      renderGalleryCard(
                        gallery,
                        selectedGalleryId === gallery._id,
                        () => setSelectedGalleryId(gallery._id)
                      )
                    )}
                  </div>
                </ScrollArea>
                <DialogFooter>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUploadToExisting}
                    disabled={!selectedGalleryId || isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload to Gallery
                  </Button>
                </DialogFooter>
              </>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <p className="text-sm text-gray-600">
              Create a new gallery for this project and upload your images to
              it:
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gallery-name">Gallery Name *</Label>
                <Input
                  id="gallery-name"
                  placeholder="Enter gallery name"
                  value={newGallery.name}
                  onChange={(e) =>
                    setNewGallery({ ...newGallery, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gallery-description">
                  Description (optional)
                </Label>
                <Textarea
                  id="gallery-description"
                  placeholder="Describe this gallery"
                  value={newGallery.description}
                  onChange={(e) =>
                    setNewGallery({
                      ...newGallery,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateGallery}
                disabled={!newGallery.name.trim() || isUploading}
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create & Upload
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="link" className="space-y-4">
            {availableGalleries.length === 0 ? (
              <div className="text-center py-8">
                <Link className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No available galleries to link.</p>
                <p className="text-sm text-gray-500">
                  All existing galleries are already linked to this project.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  Link an existing gallery to this project and upload your
                  images to it:
                </p>
                <ScrollArea className="h-64">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availableGalleries.map((gallery) =>
                      renderGalleryCard(
                        gallery,
                        selectedAvailableGalleryId === gallery._id,
                        () => setSelectedAvailableGalleryId(gallery._id)
                      )
                    )}
                  </div>
                </ScrollArea>
                <DialogFooter>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleLinkAndUpload}
                    disabled={!selectedAvailableGalleryId || isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Link className="w-4 h-4 mr-2" />
                    )}
                    Link & Upload
                  </Button>
                </DialogFooter>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
