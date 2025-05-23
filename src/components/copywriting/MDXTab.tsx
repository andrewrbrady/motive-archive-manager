"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Save, Plus, File, Loader2, Wand2, Images, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import GenerateArticleModal from "@/components/mdx/GenerateArticleModal";
import { useGalleries } from "@/lib/hooks/query/useGalleries";
import Gallery from "@/components/mdx/Gallery";

// Dynamically import MDXEditor with no SSR
const MDXEditor = dynamic(
  () => {
    if (process.env.NODE_ENV !== "production") {
      // [REMOVED] // [REMOVED] console.log("Dynamically importing MDXEditor in MDXTab");
    }
    return import("@/components/MDXEditor").then((mod) => {
      if (process.env.NODE_ENV !== "production") {
        // [REMOVED] // [REMOVED] console.log("MDXEditor module loaded in MDXTab:", mod);
      }
      if (!mod.default) {
        console.error(
          "MDXEditor default export is undefined in the module:",
          mod
        );
        throw new Error("MDXEditor component is undefined");
      }
      return mod.default;
    });
  },
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--foreground-muted))]" />
      </div>
    ),
  }
);

interface MDXFile {
  _id?: string;
  filename: string;
  content: string;
  frontmatter?: {
    title?: string;
    subtitle?: string;
    type?: string;
    slug?: string;
    author?: string;
    tags?: string[];
    cover?: string;
  };
}

interface GalleryImage {
  _id: string;
  url: string;
  filename?: string;
  metadata?: {
    description?: string;
    [key: string]: any;
  };
}

interface Gallery {
  _id: string;
  name: string;
  description?: string;
  imageIds: string[];
  orderedImages?: {
    id: string;
    order: number;
  }[];
  images?: GalleryImage[];
  thumbnailImage?: {
    _id: string;
    url: string;
    filename?: string;
    metadata?: {
      description?: string;
      [key: string]: any;
    };
  } | null;
  createdAt: string;
  updatedAt: string;
}

export default function MDXTab() {
  const [files, setFiles] = useState<MDXFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<MDXFile | null>(null);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isGeneratingArticle, setIsGeneratingArticle] = useState(false);
  const [isSelectingGallery, setIsSelectingGallery] = useState(false);
  const [gallerySearch, setGallerySearch] = useState("");
  const [newFilename, setNewFilename] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { data: galleriesData, isLoading: isLoadingGalleries } = useGalleries({
    search: gallerySearch,
  });
  const [fileToDelete, setFileToDelete] = useState<MDXFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load saved files on component mount
  useEffect(() => {
    const loadFiles = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/mdx");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load MDX files");
        }

        // [REMOVED] // [REMOVED] console.log("MDXTab - Received files from API:", data.files);

        // Ensure each file has the required properties
        const processedFiles = data.files.map((file: any) => ({
          _id: file._id,
          filename: file.filename,
          content: file.content || "",
          s3Key: file.s3Key,
          frontmatter: file.frontmatter || {},
        }));

        // [REMOVED] // [REMOVED] console.log("MDXTab - Processed files:", processedFiles);
        setFiles(processedFiles);
      } catch (error) {
        console.error("Error loading MDX files:", error);
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to load MDX files",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();
  }, [toast]);

  const handleCreateFile = () => {
    if (!newFilename) return;

    const newFile: MDXFile = {
      filename: newFilename.endsWith(".mdx")
        ? newFilename
        : `${newFilename}.mdx`,
      content: `---
title: ""
subtitle: ""
type: "page"
slug: ""
author: ""
tags: []
cover: ""
---

`,
    };

    setFiles((prev) => [...prev, newFile]);
    setSelectedFile(newFile);
    setIsCreatingFile(false);
    setNewFilename("");
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;

    setIsSaving(true);
    try {
      const method = selectedFile._id ? "PUT" : "POST";
      const body = selectedFile._id
        ? {
            id: selectedFile._id,
            content: selectedFile.content,
          }
        : {
            filename: selectedFile.filename,
            content: selectedFile.content,
          };

      const response = await fetch("/api/mdx", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save MDX file");
      }

      const { file: savedFile } = await response.json();

      // Update files list and selected file with saved version
      setFiles((prev) =>
        prev.map((file) =>
          file.filename === selectedFile.filename ? savedFile : file
        )
      );
      setSelectedFile(savedFile);

      toast({
        title: "Success",
        description: "File saved successfully",
      });
    } catch (error) {
      console.error("Error saving MDX file:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save file",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (content: string | undefined) => {
    if (!selectedFile || !content) return;

    setSelectedFile({ ...selectedFile, content });
    setFiles((prev) =>
      prev.map((file) =>
        file.filename === selectedFile.filename ? { ...file, content } : file
      )
    );
  };

  const handleGenerateArticle = async (data: {
    title: string;
    filename: string;
    content: string;
    carId?: string;
  }) => {
    try {
      const response = await fetch("/api/mdx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: data.filename.endsWith(".mdx")
            ? data.filename
            : `${data.filename}.mdx`,
          content: data.content,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate article");
      }

      const { file: generatedFile } = await response.json();
      setFiles((prev) => [...prev, generatedFile]);
      setSelectedFile(generatedFile);
      toast({
        title: "Success",
        description: "Article generated successfully",
      });
    } catch (error) {
      console.error("Error generating article:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to generate article",
        variant: "destructive",
      });
    }
  };

  const handleInsertGallery = (gallery: Gallery) => {
    if (!selectedFile || !gallery.images) return;

    // Create a map of images by their ID for quick lookup
    const imageMap = new Map(gallery.images.map((image) => [image._id, image]));

    // Get ordered images array, falling back to default order if not available
    const orderedImageIds = gallery.orderedImages?.length
      ? gallery.orderedImages
          .sort((a, b) => a.order - b.order)
          .map((item) => item.id)
      : gallery.imageIds;

    // Map the ordered IDs to their corresponding images
    const galleryImages = orderedImageIds
      .map((id, index) => {
        const image = imageMap.get(id);
        if (!image) return null;
        return {
          id: `lightbox${index + 1}`,
          src: image.url || "",
          alt: image.filename || `Gallery Image ${index + 1}`,
        };
      })
      .filter(Boolean); // Remove any null entries

    const galleryCode = `<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

    const images = ${JSON.stringify(galleryImages, null, 2)};

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
</div>`;

    // Insert the gallery code at the current cursor position or at the end
    const newContent = selectedFile.content + "\n\n" + galleryCode;
    handleFileChange(newContent);
    setIsSelectingGallery(false);
    toast({
      title: "Success",
      description: "Gallery inserted successfully",
    });
  };

  // Add delete file handler
  const handleDeleteFile = async () => {
    if (!fileToDelete || !fileToDelete._id) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/mdx?id=${fileToDelete._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete MDX file");
      }

      // Remove the file from the files list
      setFiles((prev) => prev.filter((file) => file._id !== fileToDelete._id));

      // If the deleted file was selected, clear the selection
      if (selectedFile && selectedFile._id === fileToDelete._id) {
        setSelectedFile(null);
      }

      setFileToDelete(null);

      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting MDX file:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete file",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--foreground-muted))]" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex-none p-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dialog open={isCreatingFile} onOpenChange={setIsCreatingFile}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8">
                <Plus className="h-4 w-4 mr-1" />
                New File
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New MDX File</DialogTitle>
                <DialogDescription>
                  Enter a filename for your new MDX file. The .mdx extension
                  will be added automatically if not included.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="filename">Filename</Label>
                  <Input
                    id="filename"
                    value={newFilename}
                    onChange={(e) => setNewFilename(e.target.value)}
                    placeholder="Enter filename (e.g. my-post.mdx)"
                  />
                </div>
                <Button onClick={handleCreateFile} disabled={!newFilename}>
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => setIsGeneratingArticle(true)}
          >
            <Wand2 className="h-4 w-4 mr-1" />
            Generate Article
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {selectedFile && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={handleSaveFile}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Generate Article Modal */}
      <GenerateArticleModal
        isOpen={isGeneratingArticle}
        onClose={() => setIsGeneratingArticle(false)}
        onGenerate={handleGenerateArticle}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!fileToDelete}
        onOpenChange={(open) => !open && setFileToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete MDX File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{fileToDelete?.filename}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFileToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFile}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content Container with Height Constraint */}
      <div className="h-[calc(90vh-16rem)] overflow-hidden">
        {/* Main Content */}
        <div className="h-full flex">
          {/* File List */}
          <div className="w-64 flex-none border-r border-[hsl(var(--border))] bg-[hsl(var(--background))] flex flex-col">
            <div className="flex-none p-2 border-b border-[hsl(var(--border))]">
              <h3 className="text-sm font-medium">Files</h3>
            </div>
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#111111] [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full">
              {files.length === 0 ? (
                <div className="p-4 text-sm text-[hsl(var(--foreground-muted))]">
                  No files yet
                </div>
              ) : (
                <div className="py-2">
                  {/* Debug info */}
                  <div className="px-3 py-2 text-xs text-[hsl(var(--foreground-muted))]">
                    Found {files.length} files
                  </div>

                  {files.map((file) => {
                    if (process.env.NODE_ENV !== "production") {
                      // [REMOVED] // [REMOVED] console.log("Rendering file:", file);
                    }
                    return (
                      <div
                        key={file._id || file.filename}
                        className={cn(
                          "group relative w-full px-3 py-2 text-sm hover:bg-[hsl(var(--background-subtle))]",
                          selectedFile?.filename === file.filename &&
                            "bg-[hsl(var(--background-subtle))]"
                        )}
                      >
                        <button
                          onClick={() => {
                            // [REMOVED] // [REMOVED] console.log("Selecting file:", file);
                            setSelectedFile(file);
                          }}
                          className="w-full text-left flex items-center gap-2"
                        >
                          <File className="h-4 w-4 text-[hsl(var(--foreground-muted))]" />
                          <span className="truncate">{file.filename}</span>
                        </button>

                        {file._id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFileToDelete(file);
                            }}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[hsl(var(--destructive)/0.2)] rounded-sm"
                            title="Delete file"
                          >
                            <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Editor Container */}
          <div className="flex-1 overflow-hidden">
            {selectedFile ? (
              <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                <MDXEditor
                  value={selectedFile.content}
                  onChange={handleFileChange}
                  onSave={handleSaveFile}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-[hsl(var(--foreground-muted))]">
                {files.length === 0
                  ? "Create a new MDX file to get started"
                  : "Select a file to edit"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
