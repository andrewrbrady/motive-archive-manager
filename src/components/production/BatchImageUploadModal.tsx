"use client";

import { useState, useEffect } from "react";
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
import { Upload, X, ImagePlus } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { uploadToCloudflare } from "@/lib/cloudflare";

interface BatchImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageUpload: (imageUrl: string, itemId: string) => void;
  itemId: string;
  itemName: string;
  currentImage?: string;
  directUploadUrl?: string;
}

export function BatchImageUploadModal({
  isOpen,
  onClose,
  onImageUpload,
  itemId,
  itemName,
  currentImage,
  directUploadUrl,
}: BatchImageUploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Set the preview URL if a direct upload URL is provided
  useEffect(() => {
    if (directUploadUrl) {
      setPreviewUrl(directUploadUrl);
    }
  }, [directUploadUrl]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const imageFile = files[0];
    if (!imageFile.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Only image files are allowed",
        variant: "destructive",
      });
      return;
    }

    setFile(imageFile);
    const previewUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(previewUrl);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const previewUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(previewUrl);
    }
  };

  const handleUpload = async () => {
    // Use either the selected file or the direct URL
    if (!file && !directUploadUrl) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      let imageUrl;

      // If we have a direct URL, use that
      if (directUploadUrl) {
        imageUrl = directUploadUrl;
      }
      // Otherwise upload the file using the uploadToCloudflare function
      else if (file) {
        console.log(`Starting upload for ${file.name}`);
        const result = await uploadToCloudflare(file);
        console.log(`Upload successful:`, result);
        imageUrl = result.url;
      }

      if (imageUrl) {
        onImageUpload(imageUrl, itemId);
        onClose();
        toast({
          title: "Upload successful",
          description: "Image has been uploaded",
        });
      } else {
        throw new Error("No image URL returned from upload");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    if (previewUrl && !directUploadUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Image</DialogTitle>
          <DialogDescription>Upload an image for {itemName}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 transition-colors",
              isDragging
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {previewUrl ? (
              <div className="relative aspect-square w-full max-h-[300px] overflow-hidden rounded-md">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  fill
                  className="object-contain"
                />
                <button
                  className="absolute top-2 right-2 bg-background rounded-full p-1 shadow-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (previewUrl && !directUploadUrl) {
                      URL.revokeObjectURL(previewUrl);
                    }
                    setFile(null);
                    setPreviewUrl(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : currentImage ? (
              <div className="relative aspect-square w-full max-h-[300px] overflow-hidden rounded-md">
                <Image
                  src={currentImage}
                  alt="Current image"
                  fill
                  className="object-contain"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
                  <div className="text-center space-y-2">
                    <ImagePlus className="h-8 w-8 mx-auto" />
                    <p>Drop a new image to replace</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Drag and drop an image</p>
                  <p className="text-xs text-muted-foreground">
                    or click to browse files
                  </p>
                </div>
                <Input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <Label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-block py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium"
                >
                  Select File
                </Label>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={(!previewUrl && !directUploadUrl) || isUploading}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
