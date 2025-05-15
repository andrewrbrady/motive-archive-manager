"use client";

import * as React from "react";
import { useState, useEffect, useRef, useMemo } from "react";
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
import {
  Save,
  Plus,
  File,
  Loader2,
  Wand2,
  Images,
  Trash2,
  PanelRightClose,
  PanelRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import GenerateArticleModal from "@/components/mdx/GenerateArticleModal";
import { useGalleries } from "@/lib/hooks/query/useGalleries";
import Gallery from "@/components/mdx/Gallery";
import ImageGallery from "@/components/mdx/ImageGallery";
import FullWidthGallery from "@/components/mdx/FullWidthGallery";
import * as monaco from "monaco-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ArticleIntro from "@/components/mdx/ArticleIntro";
import type { Gallery as IGallery } from "@/lib/hooks/query/useGalleries";

// Dynamically import MDXEditor with no SSR
const MDXEditor = dynamic(
  () =>
    import("@/components/MDXEditor").then((mod) => {
      if (!mod.default && !mod.MDXEditor) {
        throw new Error("MDXEditor component not found in the module");
      }
      return mod.default || mod.MDXEditor;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--foreground-muted))]" />
      </div>
    ),
  }
);

interface AdvancedMDXFile {
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
    specs?: {
      mileage?: string;
      engine?: string;
      power?: string;
      torque?: string;
      transmission?: string;
      drivetrain?: string;
      price?: string;
      [key: string]: string | undefined;
    };
  };
}

interface GalleryImage {
  id: string;
  src: string;
  alt?: string;
}

type GalleryDisplayType = "grid" | "fullWidth" | "lightbox";

interface Gallery {
  _id: string;
  name: string;
  description?: string;
  thumbnailImage?: {
    _id: string;
    url: string;
    filename?: string;
    metadata?: {
      description?: string;
      [key: string]: any;
    };
  };
  images: {
    _id: string;
    url: string;
    filename?: string;
    metadata?: {
      description?: string;
      [key: string]: any;
    };
  }[];
  imageIds?: string[];
  orderedImages?: {
    id: string;
    order: number;
  }[];
}

interface GallerySelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertGallery: (
    gallery: IGallery,
    type: GalleryDisplayType
  ) => Promise<void>;
}

export default function AdvancedMDXTab() {
  console.log("AdvancedMDXTab rendering");
  const [files, setFiles] = useState<AdvancedMDXFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<AdvancedMDXFile | null>(
    null
  );
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
  const [fileToDelete, setFileToDelete] = useState<AdvancedMDXFile | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFileListOpen, setIsFileListOpen] = useState(true);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [selectedGalleryType, setSelectedGalleryType] =
    useState<GalleryDisplayType>("grid");
  const [isInsertingGallery, setIsInsertingGallery] = useState(false);

  // Load saved files on component mount
  useEffect(() => {
    const loadFiles = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/advanced-mdx");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load advanced MDX files");
        }

        console.log("AdvancedMDXTab - Received files from API:", data.files);

        // Ensure each file has the required properties
        const processedFiles = data.files.map((file: any) => ({
          _id: file._id,
          filename: file.filename,
          content: file.content || "",
          s3Key: file.s3Key,
          frontmatter: file.frontmatter || {},
        }));

        console.log("AdvancedMDXTab - Processed files:", processedFiles);
        setFiles(processedFiles);
      } catch (error) {
        console.error("Error loading advanced MDX files:", error);
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

  const handleCreateFile = async () => {
    if (!newFilename) return;

    const filename = newFilename.endsWith(".mdx")
      ? newFilename
      : `${newFilename}.mdx`;

    const newFile: AdvancedMDXFile = {
      filename,
      content: `---
title: ""
subtitle: ""
type: "car"
slug: ""
author: ""
tags: []
cover: ""
specs:
  mileage: ""
  engine: ""
  power: ""
  torque: ""
  transmission: ""
  drivetrain: ""
  price: ""
---

<ArticleIntro
  title="Your Title Here"
  subtitle="Your subtitle or brief description goes here"
  coverImage={{
    url: "",
    alt: "Cover image"
  }}
/>

## Introduction

        Enter your introduction here...

## The Powerplant

        Enter powerplant description here...

      <ImageGallery
        images={[
          {
            id: "engine1",
            src: "",
            alt: "Engine View 1",
          },
          {
            id: "engine2",
            src: "",
            alt: "Engine View 2",
          }
        ]}
        gridConfig={{ sm: 2, md: 2, lg: 2 }}
        maxRows={1}
      />

## Specifications & Interior

Enter specifications and interior description here...

      <ImageGallery
        images={[
          {
            id: "detail1",
            src: "",
            alt: "Detail View 1"
          },
          {
            id: "detail2",
            src: "",
            alt: "Detail View 2"
          }
        ]}
        gridConfig={{ sm: 2, md: 2, lg: 2 }}
        maxRows={1}
      />

## Documentation & Heritage

Enter documentation and heritage information here...

    <FullWidthGallery
      images={[
        {
          id: "full1",
          src: "",
          alt: "Full Width View 1",
        },
        {
          id: "full2",
          src: "",
          alt: "Full Width View 2",
        },
        {
          id: "full3",
          src: "",
          alt: "Full Width View 3",
        },
      ]}
      cols={{ sm: 1, md: 3, lg: 3 }}
    />

## Gallery

    <FullWidthGallery 
      images={[
        {
          id: "gallery1",
          src: "",
          alt: "Gallery Image 1"
        },
        {
          id: "gallery2",
          src: "",
          alt: "Gallery Image 2"
        },
        {
          id: "gallery3",
          src: "",
          alt: "Gallery Image 3"
        }
      ]} 
      cols={{ sm: 2, md: 3, lg: 3 }}
/>`,
    };

    try {
      const response = await fetch("/api/advanced-mdx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: newFile.filename,
          content: newFile.content,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create file");
      }

      const { file: savedFile } = await response.json();
      setFiles((prev) => [...prev, savedFile]);
      setSelectedFile(savedFile);
      setIsCreatingFile(false);
      setNewFilename("");

      toast({
        title: "Success",
        description: "File created successfully",
      });
    } catch (error) {
      console.error("Error creating file:", error);
      toast({
        title: "Error",
        description: "Failed to create file",
        variant: "destructive",
      });
    }
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;

    setIsSaving(true);
    try {
      // If the file has an _id, it's an existing file that needs to be updated
      // If it doesn't have an _id, it's a new file that needs to be created
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

      const response = await fetch("/api/advanced-mdx", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save advanced MDX file");
      }

      // Update files list and selected file with saved version
      setFiles((prev) =>
        prev.map((file) =>
          file.filename === selectedFile.filename ? data.file : file
        )
      );
      setSelectedFile(data.file);

      toast({
        title: "Success",
        description: "File saved successfully",
      });
    } catch (error) {
      console.error("Error saving advanced MDX file:", error);
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

  const handleFileChange = (newContent: string | undefined) => {
    console.log("File content changed:", newContent);
    if (selectedFile && newContent !== undefined) {
      setFiles((prevFiles) =>
        prevFiles.map((file) =>
          file === selectedFile ? { ...file, content: newContent } : file
        )
      );
      setSelectedFile({ ...selectedFile, content: newContent });
    }
  };

  const handleGenerateArticle = async (data: {
    title: string;
    filename: string;
    content: string;
    carId?: string;
  }) => {
    try {
      const response = await fetch("/api/advanced-mdx", {
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

  const handleInsertGallery = async (
    gallery: IGallery,
    type: GalleryDisplayType
  ) => {
    console.log("Inserting gallery:", gallery, "with type:", type);

    if (!gallery._id || !selectedFile) {
      toast({
        title: "Error",
        description: "Invalid gallery data or no file selected",
        variant: "destructive",
      });
      return;
    }

    try {
      // Fetch the full gallery data to ensure we have all images
      const response = await fetch(`/api/galleries/${gallery._id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch gallery data");
      }

      const galleryData = await response.json();
      let galleryCode = "";

      switch (type) {
        case "grid":
          galleryCode = `<ImageGallery
  images={[
${galleryData.images
  .map(
    (img: any) => `    {
      src: "${img.url}",
      alt: "${img.metadata?.description || ""}"
    }`
  )
  .join(",\n")}
  ]}
/>`;
          break;
        case "fullWidth":
          galleryCode = `<FullWidthGallery
  images={[
${galleryData.images
  .map(
    (img: any) => `    {
      src: "${img.url}",
      alt: "${img.metadata?.description || ""}"
    }`
  )
  .join(",\n")}
  ]}
/>`;
          break;
        case "lightbox":
          galleryCode = `<Gallery
  images={[
${galleryData.images
  .map(
    (img: any) => `    {
      id: "${img._id}",
      src: "${img.url}",
      alt: "${img.metadata?.description || ""}"
    }`
  )
  .join(",\n")}
  ]}
/>`;
          break;
      }

      // Insert the gallery code at the cursor position
      if (selectedFile) {
        const newContent = selectedFile.content + "\n\n" + galleryCode;
        handleFileChange(newContent);
      }
    } catch (error) {
      console.error("Error inserting gallery:", error);
      toast({
        title: "Error",
        description: "Failed to insert gallery",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete || !fileToDelete._id) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/advanced-mdx?id=${fileToDelete._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to delete advanced MDX file"
        );
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
      console.error("Error deleting advanced MDX file:", error);
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

  const handleOpenGalleryDialog = () => {
    setIsSelectingGallery(true);
  };

  // Add Gallery Selection Dialog
  const GallerySelectionDialog = ({
    isOpen,
    onClose,
    onInsertGallery,
  }: GallerySelectionDialogProps) => {
    const [isInserting, setIsInserting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [displayType, setDisplayType] = useState<GalleryDisplayType>("grid");
    const [searchQuery, setSearchQuery] = useState("");
    const [galleries, setGalleries] = useState<IGallery[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      if (isOpen) {
        setIsLoading(true);
        setError(null);
        fetch("/api/galleries")
          .then(async (res: Response) => {
            if (!res.ok) {
              throw new Error("Failed to fetch galleries");
            }
            return res.json();
          })
          .then((data: { galleries: IGallery[] }) => {
            setGalleries(data.galleries);
          })
          .catch((error: Error) => {
            console.error("Error fetching galleries:", error);
            setError(error.message || "Failed to load galleries");
            toast({
              title: "Error",
              description: "Failed to load galleries",
              variant: "destructive",
            });
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    }, [isOpen]);

    return (
      <Dialog open={isOpen} onOpenChange={() => !isInserting && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Gallery</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Gallery Type</Label>
              <Select
                value={displayType}
                onValueChange={(value: GalleryDisplayType) =>
                  setDisplayType(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">Grid Gallery</SelectItem>
                  <SelectItem value="fullWidth">Full Width Gallery</SelectItem>
                  <SelectItem value="lightbox">Lightbox Gallery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="text-center py-8 text-destructive">{error}</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {galleries.map((gallery) => (
                    <Button
                      key={gallery._id}
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      disabled={isInserting}
                      onClick={async () => {
                        setIsInserting(true);
                        try {
                          await onInsertGallery(gallery, displayType);
                          onClose();
                        } catch (error) {
                          console.error("Error inserting gallery:", error);
                          toast({
                            title: "Error",
                            description: "Failed to insert gallery",
                            variant: "destructive",
                          });
                        } finally {
                          setIsInserting(false);
                        }
                      }}
                    >
                      <div className="font-medium">{gallery.name}</div>
                      {gallery.description && (
                        <div className="text-sm text-muted-foreground">
                          {gallery.description}
                        </div>
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
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
                <DialogTitle>Create New Advanced MDX File</DialogTitle>
                <DialogDescription>
                  Enter a filename for your new advanced MDX file. The .mdx
                  extension will be added automatically if not included.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="filename">Filename</Label>
                  <Input
                    id="filename"
                    value={newFilename}
                    onChange={(e) => setNewFilename(e.target.value)}
                    placeholder="Enter filename (e.g. my-car-post.mdx)"
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
            <DialogTitle>Delete Advanced MDX File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{fileToDelete?.filename}
              &quot;? This action cannot be undone.
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
      <div className="h-[calc(90vh-16rem)] flex">
        {/* File List */}
        <div
          className={cn(
            "h-full transition-all duration-200 flex-shrink-0 border-r border-[hsl(var(--border))]",
            isFileListOpen ? "w-[300px]" : "w-0"
          )}
        >
          <div className="h-full bg-[hsl(var(--background))] overflow-hidden">
            <div className="flex items-center justify-between p-2 border-b border-[hsl(var(--border))]">
              <h3 className="text-sm font-medium">Files</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => setIsFileListOpen(!isFileListOpen)}
                title={isFileListOpen ? "Hide File List" : "Show File List"}
              >
                {isFileListOpen ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRight className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="h-[calc(100%-41px)] overflow-y-auto p-2">
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
                    console.log("Rendering file:", file);
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
                            console.log("Selecting file:", file);
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
        </div>

        {/* Editor Container */}
        <div className="flex-1 h-full overflow-hidden">
          <div className="h-full relative flex flex-col">
            {!isFileListOpen && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 left-2 z-10 h-8"
                onClick={() => setIsFileListOpen(true)}
                title="Show File List"
              >
                <PanelRight className="h-4 w-4" />
              </Button>
            )}
            {selectedFile ? (
              <div className="flex-1 min-h-0">
                <MDXEditor
                  value={selectedFile.content}
                  onChange={handleFileChange}
                  onSave={handleSaveFile}
                  onInsertGallery={handleOpenGalleryDialog}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-[hsl(var(--foreground-muted))]">
                {files.length === 0
                  ? "Create a new advanced MDX file to get started"
                  : "Select a file to edit"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Selection Dialog */}
      <GallerySelectionDialog
        isOpen={isSelectingGallery}
        onClose={() => setIsSelectingGallery(false)}
        onInsertGallery={handleInsertGallery}
      />
    </div>
  );
}
