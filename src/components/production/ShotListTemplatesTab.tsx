import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Check,
  X,
  Loader2,
  Image as ImageIcon,
  Search,
  Upload,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";

export interface ShotTemplate {
  title: string;
  description: string;
  angle?: string;
  lighting?: string;
  notes?: string;
  thumbnail?: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  shots: ShotTemplate[];
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

// Helper function to safely get thumbnail URL
const getThumbnailUrl = (thumbnail: string | undefined): string => {
  if (!thumbnail) return "";
  // Always ensure the URL ends with /public for Cloudflare Images
  return thumbnail.endsWith("/public") ? thumbnail : `${thumbnail}/public`;
};

// Helper function to create a 4:3 aspect ratio container
const aspectRatio4x3 = "pb-[75%]"; // 3/4 = 0.75 = 75%

// Image Browser Component
interface ImageBrowserProps {
  onSelectImage: (imageUrl: string) => void;
}

function ImageBrowser({ onSelectImage }: ImageBrowserProps) {
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/cloudflare/images");
        if (!response.ok) {
          throw new Error("Failed to fetch images");
        }
        const data = await response.json();
        setImages(data.images || []);
      } catch (error) {
        console.error("Error fetching images:", error);
        setError("Failed to load images. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, []);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Loading images...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No images found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {images.map((imageUrl, index) => (
        <div
          key={index}
          className="relative w-full rounded-md overflow-hidden border border-[hsl(var(--border))] cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onSelectImage(imageUrl)}
        >
          <div
            className={`relative w-full ${aspectRatio4x3} bg-muted rounded-md overflow-hidden`}
          >
            <Image
              src={getThumbnailUrl(imageUrl)}
              alt={`Image ${index + 1}`}
              fill
              className="object-cover"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ShotListTemplatesTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingShotThumbnail, setUploadingShotThumbnail] = useState<
    number | null
  >(null);
  const [isImageBrowserOpen, setIsImageBrowserOpen] = useState(false);
  const [selectedShotIndex, setSelectedShotIndex] = useState<number | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shotFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const viewModeShotFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [isViewModeSelection, setIsViewModeSelection] = useState(false);

  const form = useForm<Template>({
    defaultValues: {
      name: "",
      description: "",
      shots: [],
      thumbnail: "",
    },
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    const templateId = searchParams.get("template");
    if (templateId && templates.length > 0) {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        setSelectedTemplate(template);
      }
    }
  }, [searchParams, templates]);

  useEffect(() => {
    if (selectedTemplate) {
      // Initialize refs for view mode shot thumbnails
      viewModeShotFileInputRefs.current = Array(
        selectedTemplate.shots.length
      ).fill(null);

      // Reset form with the selected template data
      form.reset({
        id: selectedTemplate.id,
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        shots: selectedTemplate.shots,
        thumbnail: selectedTemplate.thumbnail,
        createdAt: selectedTemplate.createdAt,
        updatedAt: selectedTemplate.updatedAt,
      });

      console.log("Selected template shots:", selectedTemplate.shots.length);
      console.log(
        "viewModeShotFileInputRefs initialized:",
        viewModeShotFileInputRefs.current
      );
    }
  }, [selectedTemplate, form]);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/shot-templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      setTemplates(data);

      // Select first template if none selected
      if (data.length > 0 && !searchParams.get("template")) {
        handleTemplateSelect(data[0]);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to fetch templates");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    const params = new URLSearchParams(searchParams.toString());
    params.set("template", template.id);
    router.push(`?${params.toString()}`);
  };

  const handleSubmit = async (data: Partial<Template>) => {
    try {
      const endpoint = editingTemplate
        ? `/api/shot-templates/${editingTemplate.id}`
        : "/api/shot-templates";

      const method = editingTemplate ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to save template");

      // Get the updated or created template from the response
      const savedTemplate = await response.json();

      // Update the templates state directly
      if (editingTemplate) {
        // Update existing template
        setTemplates((prevTemplates) =>
          prevTemplates.map((t) =>
            t.id === savedTemplate.id ? savedTemplate : t
          )
        );
        // If this was the selected template, update it too
        if (selectedTemplate && selectedTemplate.id === savedTemplate.id) {
          setSelectedTemplate(savedTemplate);
        }
      } else {
        // Add new template
        setTemplates((prevTemplates) => [...prevTemplates, savedTemplate]);
      }

      setIsCreating(false);
      setEditingTemplate(null);
      form.reset();
      toast.success(
        `Template ${editingTemplate ? "updated" : "created"} successfully`
      );
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const response = await fetch(`/api/shot-templates/${templateId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete template");

      // Update the templates state directly
      setTemplates((prevTemplates) =>
        prevTemplates.filter((t) => t.id !== templateId)
      );

      // If this was the selected template, clear the selection
      if (selectedTemplate && selectedTemplate.id === templateId) {
        setSelectedTemplate(null);
      }

      toast.success("Template deleted successfully");
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    form.reset(template);
  };

  const handleCancelEdit = () => {
    setEditingTemplate(null);
    form.reset();
  };

  const handleAddShot = () => {
    const currentShots = form.getValues("shots") || [];
    form.setValue("shots", [
      ...currentShots,
      {
        title: "",
        description: "",
        angle: "",
        lighting: "",
        notes: "",
        thumbnail: "",
      },
    ]);
    // Ensure we have a ref for the new shot
    shotFileInputRefs.current = [...shotFileInputRefs.current, null];
  };

  const handleRemoveShot = (index: number) => {
    const currentShots = form.getValues("shots") || [];
    form.setValue(
      "shots",
      currentShots.filter((_, i) => i !== index)
    );
  };

  const handleDuplicate = async (template: Template) => {
    try {
      const { id, createdAt, updatedAt, ...templateData } = template;
      const response = await fetch("/api/shot-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...templateData,
          name: `${templateData.name} (Copy)`,
        }),
      });

      if (!response.ok) throw new Error("Failed to duplicate template");

      // Get the duplicated template from the response
      const duplicatedTemplate = await response.json();

      // Update the templates state directly
      setTemplates((prevTemplates) => [...prevTemplates, duplicatedTemplate]);

      toast.success("Template duplicated successfully");
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast.error("Failed to duplicate template");
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (
    e: React.DragEvent<HTMLDivElement>,
    index: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

    const file = e.dataTransfer.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Store the file locally before setting state
    const localFormData = new FormData();
    localFormData.append("file", file);

    // Set loading state after preparing the data
    setUploadingThumbnail(true);

    try {
      const response = await fetch("/api/cloudflare/thumbnails", {
        method: "POST",
        body: localFormData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload thumbnail");
      }

      const data = await response.json();
      const imageUrl = data.imageUrl;

      // Update the form with the new thumbnail URL
      form.setValue("thumbnail", imageUrl);
      toast.success("Thumbnail uploaded successfully");
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      toast.error("Failed to upload thumbnail");
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const openImageBrowser = (index?: number, isViewMode: boolean = false) => {
    setSelectedShotIndex(index !== undefined ? index : null);
    setIsImageBrowserOpen(true);
    // Store whether this is from view mode or edit mode
    setIsViewModeSelection(isViewMode);
  };

  const handleSelectImage = (imageUrl: string) => {
    if (isViewModeSelection && selectedShotIndex !== null && selectedTemplate) {
      // View mode - update the template directly
      const updatedTemplate = { ...selectedTemplate };
      updatedTemplate.shots = [...selectedTemplate.shots];
      updatedTemplate.shots[selectedShotIndex] = {
        ...updatedTemplate.shots[selectedShotIndex],
        thumbnail: imageUrl,
      };

      // Use the same endpoint format as handleSubmit
      const endpoint = `/api/shot-templates/${selectedTemplate.id}`;
      console.log("Using endpoint:", endpoint);

      // First check if the template ID is valid
      fetch(`/api/shot-templates/${selectedTemplate.id}`)
        .then((response) => {
          if (!response.ok) {
            return response.text().then((errorText) => {
              console.error("Template check failed:", errorText);
              throw new Error("Invalid template ID or template not found");
            });
          }

          // Continue with the update if the template ID is valid
          return fetch(endpoint, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: updatedTemplate.name,
              description: updatedTemplate.description,
              shots: updatedTemplate.shots,
              thumbnail: updatedTemplate.thumbnail,
            }),
          });
        })
        .then((response) => {
          if (!response.ok) {
            console.error("PUT response status:", response.status);
            return response.text().then((errorText) => {
              console.error("PUT response error:", errorText);
              throw new Error("Failed to update template");
            });
          }
          setSelectedTemplate(updatedTemplate);

          // Also update the template in the templates array to keep everything in sync
          setTemplates((prevTemplates) =>
            prevTemplates.map((t) =>
              t.id === selectedTemplate.id ? updatedTemplate : t
            )
          );

          toast.success("Image selected successfully");
        })
        .catch((error) => {
          console.error("Error updating template:", error);
          toast.error("Failed to update template");
        });
    } else if (selectedShotIndex !== null) {
      // Edit mode - update the form
      form.setValue(`shots.${selectedShotIndex}.thumbnail`, imageUrl);
      toast.success("Image selected successfully");
    } else {
      // Template thumbnail
      form.setValue("thumbnail", imageUrl);
      toast.success("Image selected successfully");
    }

    setIsImageBrowserOpen(false);
  };

  const handleThumbnailUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;

    // Store the file locally before setting state
    const file = e.target.files[0];
    const localFormData = new FormData();
    localFormData.append("file", file);

    // Set loading state after preparing the data
    setUploadingThumbnail(true);

    try {
      const response = await fetch("/api/cloudflare/thumbnails", {
        method: "POST",
        body: localFormData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload thumbnail");
      }

      const data = await response.json();
      const imageUrl = data.imageUrl;

      // Update the form with the new thumbnail URL
      form.setValue("thumbnail", imageUrl);
      toast.success("Thumbnail uploaded successfully");
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      toast.error("Failed to upload thumbnail");
    } finally {
      setUploadingThumbnail(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleShotThumbnailUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;

    // Store the file locally before setting state
    const file = e.target.files[0];
    const localFormData = new FormData();
    localFormData.append("file", file);

    // Set loading state after preparing the data
    setUploadingShotThumbnail(index);

    try {
      const response = await fetch("/api/cloudflare/thumbnails", {
        method: "POST",
        body: localFormData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload thumbnail");
      }

      const data = await response.json();
      const imageUrl = data.imageUrl;

      // Update the form with the new thumbnail URL for this shot
      form.setValue(`shots.${index}.thumbnail`, imageUrl);
      toast.success("Shot thumbnail uploaded successfully");
    } catch (error) {
      console.error("Error uploading shot thumbnail:", error);
      toast.error("Failed to upload shot thumbnail");
    } finally {
      setUploadingShotThumbnail(null);
      if (shotFileInputRefs.current[index]) {
        shotFileInputRefs.current[index]!.value = "";
      }
    }
  };

  const handleViewModeShotThumbnailUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    console.log("handleViewModeShotThumbnailUpload called with index:", index);
    console.log("Files:", e.target.files);
    console.log("Selected template:", selectedTemplate);

    if (!e.target.files || !e.target.files[0] || !selectedTemplate) {
      console.error("Missing files or selected template");
      return;
    }

    // Store the file locally before setting state
    const file = e.target.files[0];
    const localFormData = new FormData();
    localFormData.append("file", file);

    // Set loading state after preparing the data
    setUploadingShotThumbnail(index);

    try {
      // First, check if the template ID is valid by making a GET request
      const checkResponse = await fetch(
        `/api/shot-templates/${selectedTemplate.id}`
      );
      if (!checkResponse.ok) {
        console.error("Template check failed:", await checkResponse.text());
        throw new Error("Invalid template ID or template not found");
      }

      // Continue with the upload if the template ID is valid
      const response = await fetch("/api/cloudflare/thumbnails", {
        method: "POST",
        body: localFormData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      const imageUrl = data.imageUrl;

      // Create a copy of the template with the new thumbnail
      const updatedTemplate = { ...selectedTemplate };
      updatedTemplate.shots = [...selectedTemplate.shots];
      updatedTemplate.shots[index] = {
        ...updatedTemplate.shots[index],
        thumbnail: imageUrl,
      };

      // Use the same endpoint format as handleSubmit
      const endpoint = `/api/shot-templates/${selectedTemplate.id}`;
      console.log("Using endpoint:", endpoint);

      // Update the template on the server using PUT with only the necessary fields
      const putResponse = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: updatedTemplate.name,
          description: updatedTemplate.description,
          shots: updatedTemplate.shots,
          thumbnail: updatedTemplate.thumbnail,
        }),
      });

      if (!putResponse.ok) {
        console.error("PUT response status:", putResponse.status);
        const errorText = await putResponse.text();
        console.error("PUT response error:", errorText);
        throw new Error("Failed to update template");
      }

      // Instead of refreshing all templates, just update the selected template in state
      setSelectedTemplate(updatedTemplate);

      // Also update the template in the templates array to keep everything in sync
      setTemplates((prevTemplates) =>
        prevTemplates.map((t) =>
          t.id === selectedTemplate.id ? updatedTemplate : t
        )
      );

      toast.success("Thumbnail uploaded successfully");
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      toast.error("Failed to upload thumbnail");
    } finally {
      setUploadingShotThumbnail(null);
      // Clear the file input
      if (viewModeShotFileInputRefs.current[index]) {
        viewModeShotFileInputRefs.current[index]!.value = "";
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Standard Car Shoot"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the purpose of this template..."
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button type="submit">Create Template</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Loading templates...
          </p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-4 text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
          No templates yet. Create a new template to get started.
        </div>
      ) : (
        <div className="grid grid-cols-[300px,1fr] gap-6">
          {/* Template List */}
          <div className="border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-lg">
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="p-2 space-y-1">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      selectedTemplate?.id === template.id
                        ? "bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]"
                        : "hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))] bg-opacity-50 text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {template.thumbnail ? (
                        <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                          <Image
                            src={
                              template.thumbnail.endsWith("/public")
                                ? template.thumbnail
                                : `${template.thumbnail}/public`
                            }
                            alt={template.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-[hsl(var(--background-subtle))] flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="w-5 h-5 text-[hsl(var(--foreground-muted))]" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                          {template.shots.length} shots
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Template Details */}
          <div className="border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-lg p-6">
            {selectedTemplate ? (
              <div className="space-y-6">
                {editingTemplate?.id === selectedTemplate.id ? (
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(handleSubmit)}
                      className="space-y-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 space-y-4">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    className="text-xl font-medium bg-transparent border-none focus:border-none focus-visible:ring-0 px-0"
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Textarea
                                    className="bg-transparent border-none focus:border-none focus-visible:ring-0 px-0 resize-none"
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="thumbnail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm text-[hsl(var(--foreground-muted))]">
                                  Thumbnail
                                </FormLabel>
                                <div className="space-y-2">
                                  {field.value ? (
                                    <div className="relative w-48 rounded-md overflow-hidden border border-[hsl(var(--border))]">
                                      <div
                                        className={aspectRatio4x3 + " relative"}
                                      >
                                        <Image
                                          src={
                                            field.value.endsWith("/public")
                                              ? field.value
                                              : `${field.value}/public`
                                          }
                                          alt="Template thumbnail"
                                          fill
                                          className="object-cover"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <div
                                      className="w-48 rounded-md border border-dashed border-[hsl(var(--border))] flex flex-col items-center justify-center cursor-pointer hover:bg-[hsl(var(--background-subtle))] transition-colors"
                                      onDragOver={(e) => handleDragOver(e)}
                                      onDrop={(e) => handleDrop(e, 0)}
                                      onClick={() =>
                                        fileInputRef.current?.click()
                                      }
                                    >
                                      <div
                                        className={
                                          aspectRatio4x3 +
                                          " relative w-full flex items-center justify-center"
                                        }
                                      >
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                          {uploadingThumbnail ? (
                                            <>
                                              <Loader2 className="w-8 h-8 text-[hsl(var(--foreground-muted))] mb-2 animate-spin" />
                                              <p className="text-xs text-center text-[hsl(var(--foreground-muted))]">
                                                Uploading...
                                              </p>
                                            </>
                                          ) : (
                                            <>
                                              <ImageIcon className="w-8 h-8 text-[hsl(var(--foreground-muted))] mb-2" />
                                              <p className="text-xs text-center text-[hsl(var(--foreground-muted))]">
                                                Drag & drop an image
                                                <br />
                                                or click to upload
                                              </p>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        fileInputRef.current?.click()
                                      }
                                      disabled={uploadingThumbnail}
                                    >
                                      {uploadingThumbnail ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      ) : (
                                        <ImageIcon className="w-4 h-4 mr-2" />
                                      )}
                                      {field.value
                                        ? "Change Thumbnail"
                                        : "Upload Thumbnail"}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openImageBrowser()}
                                    >
                                      <Search className="w-4 h-4 mr-2" />
                                      Browse Images
                                    </Button>
                                    {field.value && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          form.setValue("thumbnail", "")
                                        }
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Remove
                                      </Button>
                                    )}
                                    <input
                                      ref={fileInputRef}
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={handleThumbnailUpload}
                                    />
                                  </div>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" variant="ghost" size="sm">
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelEdit}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Shots</h4>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAddShot}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Shot
                          </Button>
                        </div>

                        {form.watch("shots")?.map((shot, index) => (
                          <div
                            key={index}
                            id={`shot-${index}`}
                            className="space-y-4 p-4 border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-lg"
                          >
                            <div className="flex justify-between items-center">
                              <h5 className="font-medium">Shot {index + 1}</h5>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveShot(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="flex flex-row gap-6">
                              {/* Left side - Thumbnail */}
                              <div className="flex-shrink-0 mr-4">
                                <div className="relative w-48">
                                  <div
                                    className={`relative w-full ${aspectRatio4x3} bg-muted rounded-md overflow-hidden`}
                                  >
                                    {shot.thumbnail ? (
                                      <Image
                                        src={getThumbnailUrl(shot.thumbnail)}
                                        alt={shot.title || "Shot thumbnail"}
                                        fill
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div
                                        className={`absolute inset-0 flex flex-col items-center justify-center p-2 text-center ${
                                          uploadingShotThumbnail === index
                                            ? ""
                                            : "cursor-pointer hover:bg-[hsl(var(--background-subtle))]"
                                        } transition-colors`}
                                        onClick={(e) => {
                                          if (uploadingShotThumbnail === index)
                                            return;
                                          e.preventDefault();
                                          console.log(
                                            "Upload button clicked for index:",
                                            index
                                          );
                                          console.log(
                                            "viewModeShotFileInputRefs.current:",
                                            viewModeShotFileInputRefs.current
                                          );
                                          console.log(
                                            "viewModeShotFileInputRefs.current[index]:",
                                            viewModeShotFileInputRefs.current[
                                              index
                                            ]
                                          );

                                          // Try to find the input element by its data attribute
                                          const buttonInputElement =
                                            document.querySelector(
                                              `input[type="file"][data-shot-index="${index}"]`
                                            ) as HTMLInputElement;
                                          if (buttonInputElement) {
                                            console.log(
                                              "Found input element by data attribute:",
                                              buttonInputElement
                                            );
                                            buttonInputElement.click();
                                          } else if (
                                            viewModeShotFileInputRefs.current[
                                              index
                                            ]
                                          ) {
                                            viewModeShotFileInputRefs.current[
                                              index
                                            ]?.click();
                                          } else {
                                            console.error(
                                              "No file input ref found for index:",
                                              index
                                            );
                                          }
                                        }}
                                      >
                                        {uploadingShotThumbnail === index ? (
                                          <>
                                            <Loader2 className="w-8 h-8 mb-2 text-muted-foreground animate-spin" />
                                            <span className="text-xs text-muted-foreground">
                                              Uploading...
                                            </span>
                                          </>
                                        ) : (
                                          <>
                                            <ImageIcon className="w-8 h-8 mb-2 text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground">
                                              No thumbnail
                                              <br />
                                              Click to upload
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex mt-2 space-x-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="flex-1"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        if (
                                          viewModeShotFileInputRefs.current[
                                            index
                                          ]
                                        ) {
                                          viewModeShotFileInputRefs.current[
                                            index
                                          ]?.click();
                                        }
                                      }}
                                    >
                                      <Upload className="w-4 h-4 mr-2" />
                                      {shot.thumbnail ? "Change" : "Upload"}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        openImageBrowser(index, true);
                                      }}
                                    >
                                      <Search className="w-4 h-4 mr-2" />
                                      Browse
                                    </Button>
                                  </div>
                                  <input
                                    type="file"
                                    data-shot-index={index}
                                    ref={(el) => {
                                      // Ensure the array is initialized
                                      if (!viewModeShotFileInputRefs.current) {
                                        viewModeShotFileInputRefs.current = [];
                                      }

                                      // Ensure the array is large enough
                                      if (
                                        viewModeShotFileInputRefs.current
                                          .length <= index
                                      ) {
                                        const newArray = [
                                          ...viewModeShotFileInputRefs.current,
                                        ];
                                        while (newArray.length <= index) {
                                          newArray.push(null);
                                        }
                                        viewModeShotFileInputRefs.current =
                                          newArray;
                                      }

                                      // Set the ref
                                      viewModeShotFileInputRefs.current[index] =
                                        el;
                                      console.log(
                                        `Ref set for index ${index}:`,
                                        el
                                      );
                                    }}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) =>
                                      handleViewModeShotThumbnailUpload(
                                        e,
                                        index
                                      )
                                    }
                                  />
                                </div>
                              </div>

                              {/* Right side - Form fields */}
                              <div className="flex-grow space-y-4">
                                <FormField
                                  control={form.control}
                                  name={`shots.${index}.title`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Title</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder="e.g., Front 3/4 View"
                                          {...field}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`shots.${index}.description`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Description</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Describe the shot composition..."
                                          {...field}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name={`shots.${index}.angle`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Angle</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="e.g., Low angle, eye level"
                                            {...field}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`shots.${index}.lighting`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Lighting</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="e.g., Natural, Studio"
                                            {...field}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <FormField
                                  control={form.control}
                                  name={`shots.${index}.notes`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Notes</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Additional notes or instructions..."
                                          {...field}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </form>
                  </Form>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-xl font-medium">
                          {selectedTemplate?.name}
                        </h2>
                        <p className="text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] mt-1">
                          {selectedTemplate?.description}
                        </p>

                        {selectedTemplate?.thumbnail &&
                          typeof selectedTemplate.thumbnail === "string" && (
                            <div className="mt-4">
                              <p className="text-sm text-[hsl(var(--foreground-muted))] mb-2">
                                Thumbnail
                              </p>
                              <div className="relative w-48 rounded-md overflow-hidden border border-[hsl(var(--border))]">
                                <div className={aspectRatio4x3 + " relative"}>
                                  <Image
                                    src={getThumbnailUrl(
                                      selectedTemplate.thumbnail
                                    )}
                                    alt={
                                      selectedTemplate.name ||
                                      "Template thumbnail"
                                    }
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            selectedTemplate &&
                            handleDuplicate(selectedTemplate)
                          }
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            selectedTemplate && handleEdit(selectedTemplate)
                          }
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            selectedTemplate &&
                            handleDelete(selectedTemplate.id)
                          }
                          className="text-destructive-500 hover:text-destructive-700 hover:bg-destructive-50 dark:hover:bg-destructive-950"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Shots</h3>
                      <div className="grid gap-4">
                        {selectedTemplate?.shots.map((shot, index) => (
                          <div
                            key={index}
                            className="border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-lg p-4"
                          >
                            <div className="flex flex-row gap-4">
                              {/* Left side - Thumbnail */}
                              <div className="flex-shrink-0 mr-4">
                                <div className="relative w-48">
                                  <div
                                    className={`relative w-full ${aspectRatio4x3} bg-muted rounded-md overflow-hidden`}
                                  >
                                    {shot.thumbnail ? (
                                      <Image
                                        src={getThumbnailUrl(shot.thumbnail)}
                                        alt={shot.title || "Shot thumbnail"}
                                        fill
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div
                                        className={`absolute inset-0 flex flex-col items-center justify-center p-2 text-center ${
                                          uploadingShotThumbnail === index
                                            ? ""
                                            : "cursor-pointer hover:bg-[hsl(var(--background-subtle))]"
                                        } transition-colors`}
                                        onClick={(e) => {
                                          if (uploadingShotThumbnail === index)
                                            return;
                                          e.preventDefault();
                                          console.log(
                                            "Upload button clicked for index:",
                                            index
                                          );
                                          console.log(
                                            "viewModeShotFileInputRefs.current:",
                                            viewModeShotFileInputRefs.current
                                          );
                                          console.log(
                                            "viewModeShotFileInputRefs.current[index]:",
                                            viewModeShotFileInputRefs.current[
                                              index
                                            ]
                                          );

                                          // Try to find the input element by its data attribute
                                          const buttonInputElement =
                                            document.querySelector(
                                              `input[type="file"][data-shot-index="${index}"]`
                                            ) as HTMLInputElement;
                                          if (buttonInputElement) {
                                            console.log(
                                              "Found input element by data attribute:",
                                              buttonInputElement
                                            );
                                            buttonInputElement.click();
                                          } else if (
                                            viewModeShotFileInputRefs.current[
                                              index
                                            ]
                                          ) {
                                            viewModeShotFileInputRefs.current[
                                              index
                                            ]?.click();
                                          } else {
                                            console.error(
                                              "No file input ref found for index:",
                                              index
                                            );
                                          }
                                        }}
                                      >
                                        {uploadingShotThumbnail === index ? (
                                          <>
                                            <Loader2 className="w-8 h-8 mb-2 text-muted-foreground animate-spin" />
                                            <span className="text-xs text-muted-foreground">
                                              Uploading...
                                            </span>
                                          </>
                                        ) : (
                                          <>
                                            <ImageIcon className="w-8 h-8 mb-2 text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground">
                                              No thumbnail
                                              <br />
                                              Click to upload
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex mt-2 space-x-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="flex-1"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        if (
                                          viewModeShotFileInputRefs.current[
                                            index
                                          ]
                                        ) {
                                          viewModeShotFileInputRefs.current[
                                            index
                                          ]?.click();
                                        }
                                      }}
                                    >
                                      <Upload className="w-4 h-4 mr-2" />
                                      {shot.thumbnail ? "Change" : "Upload"}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        openImageBrowser(index, true);
                                      }}
                                    >
                                      <Search className="w-4 h-4 mr-2" />
                                      Browse
                                    </Button>
                                  </div>
                                  <input
                                    type="file"
                                    data-shot-index={index}
                                    ref={(el) => {
                                      // Ensure the array is initialized
                                      if (!viewModeShotFileInputRefs.current) {
                                        viewModeShotFileInputRefs.current = [];
                                      }

                                      // Ensure the array is large enough
                                      if (
                                        viewModeShotFileInputRefs.current
                                          .length <= index
                                      ) {
                                        const newArray = [
                                          ...viewModeShotFileInputRefs.current,
                                        ];
                                        while (newArray.length <= index) {
                                          newArray.push(null);
                                        }
                                        viewModeShotFileInputRefs.current =
                                          newArray;
                                      }

                                      // Set the ref
                                      viewModeShotFileInputRefs.current[index] =
                                        el;
                                      console.log(
                                        `Ref set for index ${index}:`,
                                        el
                                      );
                                    }}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) =>
                                      handleViewModeShotThumbnailUpload(
                                        e,
                                        index
                                      )
                                    }
                                  />
                                </div>
                              </div>

                              {/* Right side - Shot details */}
                              <div className="flex-grow space-y-2">
                                <h4 className="font-medium">{shot.title}</h4>
                                <p className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                                  {shot.description}
                                </p>

                                {(shot.angle ||
                                  shot.lighting ||
                                  shot.notes) && (
                                  <div className="text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] space-y-1 mt-2">
                                    {shot.angle && <p>Angle: {shot.angle}</p>}
                                    {shot.lighting && (
                                      <p>Lighting: {shot.lighting}</p>
                                    )}
                                    {shot.notes && <p>Notes: {shot.notes}</p>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                Select a template to view its details
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Browser Dialog */}
      <Dialog open={isImageBrowserOpen} onOpenChange={setIsImageBrowserOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Browse Images</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <ImageBrowser onSelectImage={handleSelectImage} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
