"use client";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2,
  Plus,
  Settings2,
  Pencil,
  Copy,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";

import { useAPI } from "@/hooks/useAPI";

// Define batch interfaces locally
interface DeliverableTemplate {
  title: string;
  platform_id?: string;
  platform?: string; // Legacy field
  mediaTypeId?: string;
  type?: string; // Legacy field
  duration?: number;
  aspect_ratio: string;
  daysUntilDeadline?: number;
  daysUntilRelease?: number;
}

interface BatchTemplate {
  name: string;
  templates: DeliverableTemplate[];
}

export default function BatchTemplateManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<Record<string, BatchTemplate>>({});
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [newTemplate, setNewTemplate] = useState<BatchTemplate>({
    name: "",
    templates: [],
  });
  const api = useAPI();

  if (!api) return <div>Loading...</div>;

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, api]);

  // Fetch templates on mount
  const fetchTemplates = async () => {
    try {
      const data = (await api.get("batch-templates")) as {
        templates: Record<string, BatchTemplate>;
      };
      setTemplates(data.templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to fetch templates");
    }
  };

  // Start editing a template
  const startEditing = (name: string) => {
    const template = templates[name];
    setNewTemplate(template);
    setEditingTemplate(name);
  };

  // Cancel editing
  const cancelEditing = () => {
    setNewTemplate({ name: "", templates: [] });
    setEditingTemplate(null);
  };

  // Save template
  const saveTemplate = async () => {
    if (!newTemplate.name) {
      toast.error("Please enter a template name");
      return;
    }

    if (newTemplate.templates.length === 0) {
      toast.error("Please add at least one deliverable to the template");
      return;
    }

    try {
      await api.post("batch-templates", newTemplate);

      toast.success("Template saved successfully");
      fetchTemplates();
      setNewTemplate({ name: "", templates: [] });
      setEditingTemplate(null);
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    }
  };

  // Delete template
  const deleteTemplate = async (name: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      await api.delete(`batch-templates/${encodeURIComponent(name)}`);

      toast.success("Template deleted successfully");
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  // Add duplicate template function after deleteTemplate
  const duplicateTemplate = async (name: string) => {
    const template = templates[name];
    const newName = `${template.name} (Copy)`;

    // Create new template object with copied data
    const duplicatedTemplate: BatchTemplate = {
      name: newName,
      templates: [...template.templates], // Create deep copy of templates array
    };

    try {
      await api.post("batch-templates", duplicatedTemplate);

      toast.success("Template duplicated successfully");
      fetchTemplates();
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast.error("Failed to duplicate template");
    }
  };

  // Add new deliverable to template
  const addDeliverable = () => {
    setNewTemplate((prev) => ({
      ...prev,
      templates: [
        ...prev.templates,
        {
          title: "",
          platform: "Instagram Reels",
          type: "Video",
          duration: 15,
          aspect_ratio: "9:16",
          daysFromStart: 0,
          daysUntilDeadline: 7,
        },
      ],
    }));
  };

  // Remove deliverable from template
  const removeDeliverable = (index: number) => {
    setNewTemplate((prev) => ({
      ...prev,
      templates: prev.templates.filter((_, i) => i !== index),
    }));
  };

  // Update deliverable in template
  const updateDeliverable = (
    index: number,
    field: keyof DeliverableTemplate,
    value: string | number | undefined
  ) => {
    setNewTemplate((prev) => ({
      ...prev,
      templates: prev.templates.map((template, i) =>
        i === index ? { ...template, [field]: value } : template
      ),
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings2 className="w-4 h-4 mr-2" />
          Manage Batch Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] w-full max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Batch Templates</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 flex-1 overflow-y-auto">
          {/* Create/Edit template section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center sticky top-0 bg-background z-10 py-2">
              <h3 className="text-lg font-medium">
                {editingTemplate
                  ? `Editing "${editingTemplate}"`
                  : "Create New Template"}
              </h3>
              {editingTemplate && (
                <Button variant="outline" onClick={cancelEditing}>
                  Cancel Editing
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Template Name"
                value={newTemplate.name}
                onChange={(e) =>
                  setNewTemplate((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                className="max-w-md"
              />

              <div className="space-y-4">
                {newTemplate.templates.map((template, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[200px_1fr_140px_140px_120px_120px_auto] gap-3 items-start p-3 rounded-lg border bg-card transition-all"
                  >
                    <Select
                      value={template.platform}
                      onValueChange={(value) =>
                        updateDeliverable(index, "platform", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Instagram Reels">
                          Instagram Reels
                        </SelectItem>
                        <SelectItem value="Instagram Post">
                          Instagram Post
                        </SelectItem>
                        <SelectItem value="Instagram Story">
                          Instagram Story
                        </SelectItem>
                        <SelectItem value="YouTube">YouTube</SelectItem>
                        <SelectItem value="YouTube Shorts">
                          YouTube Shorts
                        </SelectItem>
                        <SelectItem value="TikTok">TikTok</SelectItem>
                        <SelectItem value="Facebook">Facebook</SelectItem>
                        <SelectItem value="Bring a Trailer">
                          Bring a Trailer
                        </SelectItem>
                        <SelectItem value="Marketing Email">
                          Marketing Email
                        </SelectItem>
                        <SelectItem value="Blog">Blog</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Title"
                      value={template.title}
                      onChange={(e) =>
                        updateDeliverable(index, "title", e.target.value)
                      }
                    />
                    <Select
                      value={template.type}
                      onValueChange={(value) =>
                        updateDeliverable(index, "type", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Photo Gallery">
                          Photo Gallery
                        </SelectItem>
                        <SelectItem value="Video">Video</SelectItem>
                        <SelectItem value="Mixed Gallery">
                          Mixed Gallery
                        </SelectItem>
                        <SelectItem value="Video Gallery">
                          Video Gallery
                        </SelectItem>
                        <SelectItem value="Text">Text</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {template.type === "Video" && (
                      <Input
                        type="number"
                        placeholder="Duration (s)"
                        value={template.duration}
                        onChange={(e) =>
                          updateDeliverable(
                            index,
                            "duration",
                            parseInt(e.target.value)
                          )
                        }
                      />
                    )}
                    <Input
                      type="number"
                      placeholder="Days to Deadline"
                      value={template.daysUntilDeadline}
                      onChange={(e) =>
                        updateDeliverable(
                          index,
                          "daysUntilDeadline",
                          e.target.value === "" ? 0 : parseInt(e.target.value)
                        )
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Days to Release"
                      value={template.daysUntilRelease ?? ""}
                      onChange={(e) =>
                        updateDeliverable(
                          index,
                          "daysUntilRelease",
                          e.target.value === ""
                            ? undefined
                            : parseInt(e.target.value)
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDeliverable(index)}
                      className="text-destructive-500 hover:text-destructive-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button onClick={addDeliverable} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Deliverable
                </Button>
              </div>

              {newTemplate.templates.length > 0 && (
                <div className="space-y-4">
                  <Button onClick={saveTemplate}>
                    {editingTemplate ? "Update Template" : "Save Template"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Existing templates section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Existing Templates</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Template Name</TableHead>
                    <TableHead>Deliverables</TableHead>
                    <TableHead className="w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(templates).map(([name, template]) => (
                    <TableRow key={name}>
                      <TableCell>{template.name}</TableCell>
                      <TableCell>
                        <ul className="list-disc list-inside">
                          {template.templates.map((deliverable, index) => (
                            <li key={index} className="text-sm">
                              {deliverable.title} - {deliverable.platform} (
                              {deliverable.type}
                              {deliverable.duration
                                ? ` - ${deliverable.duration}s`
                                : ""}
                              )
                            </li>
                          ))}
                        </ul>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(name)}
                            className="text-info-500 hover:text-info-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateTemplate(name)}
                            className="text-success-500 hover:text-success-700"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTemplate(name)}
                            className="text-destructive-500 hover:text-destructive-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
