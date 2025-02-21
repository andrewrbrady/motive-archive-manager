import { useState, useEffect } from "react";
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
import { Plus, Edit, Trash2, Save, Copy } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface ShotTemplate {
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
}

interface ShotListTemplatesProps {
  onApplyTemplate: (shots: ShotTemplate[]) => void;
}

export default function ShotListTemplates({
  onApplyTemplate,
}: ShotListTemplatesProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    onApplyTemplate(template.shots);
    toast.success("Template applied successfully");
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

  return (
    <div>
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
              {editingTemplate ? "Edit Template" : "Create Shot List Template"}
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
                  <div key={index} className="space-y-4 p-4 border rounded-lg">
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
                              placeholder="Any additional notes..."
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
                  <Save className="w-4 h-4 mr-2" />
                  {editingTemplate ? "Update Template" : "Save Template"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="mt-4 space-y-4">
        <h3 className="text-lg font-semibold">Available Templates</h3>
        {isLoading ? (
          <div className="text-center py-4">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No templates available. Create your first template to get started.
          </div>
        ) : (
          <div className="grid gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{template.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {template.description}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {template.shots.length} shots
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyTemplate(template)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Apply
                    </Button>
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
