import { useState, useEffect, useRef, createRef } from "react";
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
  Save,
  Copy,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
}

interface ShotListTemplatesProps {
  onApplyTemplate: (shots: ShotTemplate[]) => void;
  isEmbedded?: boolean;
}

export default function ShotListTemplates({
  onApplyTemplate,
  isEmbedded = false,
}: ShotListTemplatesProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingThumbnail, setUploadingThumbnail] = useState<{
    [key: string]: boolean;
  }>({});
  const templateThumbnailRef = useRef<HTMLInputElement>(null);
  const shotThumbnailRefs = useRef<{
    [key: number]: React.RefObject<HTMLInputElement>;
  }>({});

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

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/shot-templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to fetch templates");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: Template) => {
    try {
      const isEditing = !!editingTemplate;
      const endpoint = isEditing
        ? `/api/shot-templates/${editingTemplate.id}`
        : "/api/shot-templates";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to save template");

      await fetchTemplates();
      toast.success(
        isEditing
          ? "Template updated successfully"
          : "Template created successfully"
      );
      setIsCreating(false);
      setEditingTemplate(null);
      form.reset();
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

      await fetchTemplates();
      toast.success("Template deleted successfully");
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    form.reset(template);
    setIsCreating(true);
  };

  const handleApplyTemplate = (template: Template) => {
    if (!template.shots || template.shots.length === 0) {
      toast.error("This template has no shots");
      return;
    }
    onApplyTemplate(template.shots);
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
  };

  const handleRemoveShot = (index: number) => {
    const currentShots = form.getValues("shots") || [];
    form.setValue(
      "shots",
      currentShots.filter((_, i) => i !== index)
    );
  };

  const handleThumbnailUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldPath: string
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setUploadingThumbnail((prev) => ({ ...prev, [fieldPath]: true }));

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/cloudflare/images", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload thumbnail");
      }

      const data = await response.json();
      const imageUrl = data.imageUrl;

      // Update the form with the new thumbnail URL
      if (fieldPath === "thumbnail") {
        form.setValue("thumbnail", imageUrl);
      } else if (fieldPath.startsWith("shots.")) {
        // Handle nested fields for shots
        form.setValue(fieldPath as any, imageUrl);
      }

      toast.success("Thumbnail uploaded successfully");
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      toast.error("Failed to upload thumbnail");
    } finally {
      setUploadingThumbnail((prev) => ({ ...prev, [fieldPath]: false }));
      // Reset the file input
      e.target.value = "";
    }
  };

  // Initialize refs for existing shots when editing a template
  useEffect(() => {
    if (editingTemplate) {
      editingTemplate.shots.forEach((_, index) => {
        if (!shotThumbnailRefs.current[index]) {
          shotThumbnailRefs.current[index] = createRef<HTMLInputElement>();
        }
      });
    }
  }, [editingTemplate]);

  return (
    <div>
      <div>
        {!isEmbedded && (
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate
                    ? "Edit Template"
                    : "Create Shot List Template"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="space-y-6"
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
                        <FormLabel>Template Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the purpose of this template..."
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
                        <FormLabel>Thumbnail</FormLabel>
                        <div className="space-y-2">
                          {field.value && (
                            <div className="relative w-40 h-40 rounded-md overflow-hidden border border-[hsl(var(--border))]">
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
                          )}
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                templateThumbnailRef.current?.click()
                              }
                              disabled={uploadingThumbnail["thumbnail"]}
                            >
                              {uploadingThumbnail["thumbnail"] ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <ImageIcon className="w-4 h-4 mr-2" />
                              )}
                              {field.value
                                ? "Change Thumbnail"
                                : "Upload Thumbnail"}
                            </Button>
                            {field.value && (
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => form.setValue("thumbnail", "")}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remove
                              </Button>
                            )}
                            <input
                              ref={templateThumbnailRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                handleThumbnailUpload(e, "thumbnail")
                              }
                            />
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />

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

                    {form.watch("shots")?.map((_, index) => (
                      <div
                        key={index}
                        className="space-y-4 p-4 border rounded-lg"
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
                        <FormField
                          control={form.control}
                          name={`shots.${index}.notes`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Additional notes for the photographer..."
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`shots.${index}.thumbnail`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Thumbnail</FormLabel>
                              <div className="space-y-2">
                                {field.value && (
                                  <div className="relative w-40 h-40 rounded-md overflow-hidden border border-[hsl(var(--border))]">
                                    <Image
                                      src={
                                        field.value.endsWith("/public")
                                          ? field.value
                                          : `${field.value}/public`
                                      }
                                      alt="Shot thumbnail"
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      // Create a file input dynamically
                                      const input =
                                        document.createElement("input");
                                      input.type = "file";
                                      input.accept = "image/*";
                                      input.onchange = (event) => {
                                        const target =
                                          event.target as HTMLInputElement;
                                        if (
                                          target.files &&
                                          target.files.length > 0
                                        ) {
                                          handleThumbnailUpload(
                                            { target } as any,
                                            `shots.${index}.thumbnail`
                                          );
                                        }
                                      };
                                      input.click();
                                    }}
                                    disabled={
                                      uploadingThumbnail[
                                        `shots.${index}.thumbnail`
                                      ]
                                    }
                                  >
                                    {uploadingThumbnail[
                                      `shots.${index}.thumbnail`
                                    ] ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                      <ImageIcon className="w-4 h-4 mr-2" />
                                    )}
                                    {field.value
                                      ? "Change Thumbnail"
                                      : "Upload Thumbnail"}
                                  </Button>
                                  {field.value && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        form.setValue(
                                          `shots.${index}.thumbnail` as any,
                                          ""
                                        )
                                      }
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Remove
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit">
                      <Save className="w-4 h-4 mr-2" />
                      {editingTemplate ? "Update Template" : "Save Template"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}

        <div className={`space-y-4 ${isEmbedded ? "" : "mt-4"}`}>
          {!isEmbedded && (
            <h3 className="text-lg font-semibold">Available Templates</h3>
          )}
          <div className="mt-4">
            {isLoading ? (
              <div className="text-center py-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Loading templates...
                </p>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No templates available.{" "}
                {!isEmbedded && "Create your first template to get started."}
              </div>
            ) : (
              <div className="grid gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg p-4"
                  >
                    <div className="flex items-start gap-4">
                      {template.thumbnail && (
                        <div className="relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
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
                      )}
                      <div className="flex-grow">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{template.name}</h4>
                            <p className="text-sm text-[hsl(var(--foreground-muted))]">
                              {template.description}
                            </p>
                            <p className="text-sm text-[hsl(var(--foreground-muted))] mt-1">
                              {template.shots.length} shots
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {!isEmbedded && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(template)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(template.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApplyTemplate(template)}
                            >
                              {isEmbedded ? "Use Template" : "Apply Template"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
