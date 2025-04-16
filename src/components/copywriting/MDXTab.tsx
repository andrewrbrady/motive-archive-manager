import React, { useState, useEffect } from "react";
import { MDXEditor } from "@/components/MDXEditor";
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
import { Save, Plus, File, Loader2, Wand2, Images } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import GenerateArticleModal from "@/components/mdx/GenerateArticleModal";
import { useGalleries } from "@/lib/hooks/query/useGalleries";
import Gallery from "@/components/mdx/Gallery";

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

        setFiles(data.files);
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
    carId?: string;
  }) => {
    try {
      const response = await fetch("/api/mdx/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
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

    const galleryImages = gallery.images.map((image, index) => ({
      id: `lightbox${index + 1}`,
      src: image.url || "",
      alt: image.filename || `Gallery Image ${index + 1}`,
    }));

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
                  {files.map((file) => (
                    <button
                      key={file._id || file.filename}
                      onClick={() => setSelectedFile(file)}
                      className={cn(
                        "w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-[hsl(var(--background-subtle))]",
                        selectedFile?.filename === file.filename &&
                          "bg-[hsl(var(--background-subtle))]"
                      )}
                    >
                      <File className="h-4 w-4 text-[hsl(var(--foreground-muted))]" />
                      <span className="truncate">{file.filename}</span>
                    </button>
                  ))}
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
