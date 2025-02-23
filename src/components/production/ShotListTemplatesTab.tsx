import React, { useState, useEffect } from "react";
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
import { Plus, Edit, Trash2, Copy } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ShotTemplate {
  title: string;
  description: string;
  angle?: string;
  lighting?: string;
  notes?: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  shots: ShotTemplate[];
  createdAt: string;
  updatedAt: string;
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

  const form = useForm<Template>({
    defaultValues: {
      name: "",
      description: "",
      shots: [],
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

      await fetchTemplates();
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

      await fetchTemplates();
      toast.success("Template duplicated successfully");
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast.error("Failed to duplicate template");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Shot List Templates</h3>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Template" : "Create New Template"}
              </DialogTitle>
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
                                placeholder="Additional notes or instructions..."
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button type="submit">
                    {editingTemplate ? "Update Template" : "Create Template"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-4">Loading templates...</div>
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
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                      {template.shots.length} shots
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
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-medium">
                      {selectedTemplate.name}
                    </h2>
                    <p className="text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] mt-1">
                      {selectedTemplate.description}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(selectedTemplate)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(selectedTemplate)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(selectedTemplate.id)}
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
                    {selectedTemplate.shots.map((shot, index) => (
                      <div
                        key={index}
                        className="border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-lg p-4 space-y-2"
                      >
                        <h4 className="font-medium">{shot.title}</h4>
                        <p className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                          {shot.description}
                        </p>
                        {(shot.angle || shot.lighting || shot.notes) && (
                          <div className="text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] space-y-1 mt-2">
                            {shot.angle && <p>Angle: {shot.angle}</p>}
                            {shot.lighting && <p>Lighting: {shot.lighting}</p>}
                            {shot.notes && <p>Notes: {shot.notes}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                Select a template to view its details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
