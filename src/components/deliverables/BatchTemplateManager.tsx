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
import { BatchTemplate, DeliverableTemplate } from "@/types/deliverable";
import DeliverableTemplateGantt from "./DeliverableTemplateGantt";

export default function BatchTemplateManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<Record<string, BatchTemplate>>({});
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [newTemplate, setNewTemplate] = useState<BatchTemplate>({
    name: "",
    templates: [],
  });

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  // Fetch templates on mount
  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/batch-templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
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
      const response = await fetch("/api/batch-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTemplate),
      });

      if (!response.ok) throw new Error("Failed to save template");

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
      const response = await fetch(
        `/api/batch-templates/${encodeURIComponent(name)}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to delete template");

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
      const response = await fetch("/api/batch-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(duplicatedTemplate),
      });

      if (!response.ok) throw new Error("Failed to duplicate template");

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
          daysUntilRelease: 9,
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
    value: string | number
  ) => {
    setNewTemplate((prev) => ({
      ...prev,
      templates: prev.templates.map((template, i) =>
        i === index ? { ...template, [field]: value } : template
      ),
    }));
  };

  const handleTemplateUpdate = (
    index: number,
    updates: Partial<DeliverableTemplate>
  ) => {
    setNewTemplate((prev) => ({
      ...prev,
      templates: prev.templates.map((template, i) =>
        i === index ? { ...template, ...updates } : template
      ),
    }));
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    setNewTemplate((prev) => {
      const newTemplates = [...prev.templates];
      const [movedTemplate] = newTemplates.splice(fromIndex, 1);
      newTemplates.splice(toIndex, 0, movedTemplate);
      return { ...prev, templates: newTemplates };
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const element = e.currentTarget as HTMLElement;
    element.style.transform = "translateY(2px)";
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const element = e.currentTarget as HTMLElement;
    element.style.transform = "";
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
    if (fromIndex !== toIndex) {
      handleReorder(fromIndex, toIndex);
    }
    const element = e.currentTarget as HTMLElement;
    element.style.transform = "";
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
                    className="grid grid-cols-[auto_200px_1fr_140px_140px_120px_120px_auto] gap-3 items-start p-3 rounded-lg border bg-card transition-all"
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    <div className="cursor-move opacity-50 hover:opacity-100 mt-2">
                      <GripVertical className="h-4 w-4" />
                    </div>
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
                      value={template.daysUntilRelease}
                      onChange={(e) =>
                        updateDeliverable(
                          index,
                          "daysUntilRelease",
                          e.target.value === "" ? 0 : parseInt(e.target.value)
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDeliverable(index)}
                      className="text-red-500 hover:text-red-700"
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
                  <div className="mt-8">
                    <h4 className="text-sm font-medium mb-2">
                      Timeline Preview
                    </h4>
                    <DeliverableTemplateGantt
                      template={newTemplate}
                      onTemplateUpdate={handleTemplateUpdate}
                      onReorder={handleReorder}
                    />
                  </div>

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
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateTemplate(name)}
                            className="text-green-500 hover:text-green-700"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTemplate(name)}
                            className="text-red-500 hover:text-red-700"
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
