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
import { EventType } from "@/types/event";
import EventTemplateGantt from "./EventTemplateGantt";
import { useAPI } from "@/hooks/useAPI";

interface EventTemplate {
  type: EventType;
  description: string;
  daysFromStart: number;
  hasEndDate?: boolean;
  daysUntilEnd?: number;
  isAllDay?: boolean;
}

interface BatchTemplate {
  name: string;
  events: EventTemplate[];
}

interface EventTemplatesResponse {
  templates: Record<string, BatchTemplate>;
}

const formatEventType = (type: string) => {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export default function EventBatchManager() {
  const api = useAPI();
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<Record<string, BatchTemplate>>({});
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [newTemplate, setNewTemplate] = useState<BatchTemplate>({
    name: "",
    events: [],
  });

  useEffect(() => {
    if (isOpen && api) {
      fetchTemplates();
    }
  }, [isOpen, api]);

  const fetchTemplates = async () => {
    if (!api) return;
    try {
      const data = (await api.get("event-templates")) as EventTemplatesResponse;
      setTemplates(data.templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to fetch templates");
    }
  };

  const startEditing = (name: string) => {
    const template = templates[name];
    setNewTemplate(template);
    setEditingTemplate(name);
  };

  const cancelEditing = () => {
    setNewTemplate({ name: "", events: [] });
    setEditingTemplate(null);
  };

  const saveTemplate = async () => {
    if (!newTemplate.name) {
      toast.error("Please enter a template name");
      return;
    }

    if (newTemplate.events.length === 0) {
      toast.error("Please add at least one event to the template");
      return;
    }

    if (!api) return;

    try {
      await api.post("event-templates", newTemplate);

      toast.success("Template saved successfully");
      fetchTemplates();
      setNewTemplate({ name: "", events: [] });
      setEditingTemplate(null);
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    }
  };

  const deleteTemplate = async (name: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    if (!api) return;

    try {
      await api.delete(`event-templates/${encodeURIComponent(name)}`);

      toast.success("Template deleted successfully");
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const duplicateTemplate = async (name: string) => {
    const template = templates[name];
    const newName = `${template.name} (Copy)`;

    const duplicatedTemplate: BatchTemplate = {
      name: newName,
      events: [...template.events],
    };

    if (!api) return;

    try {
      await api.post("event-templates", duplicatedTemplate);

      toast.success("Template duplicated successfully");
      fetchTemplates();
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast.error("Failed to duplicate template");
    }
  };

  const addEvent = () => {
    setNewTemplate((prev) => ({
      ...prev,
      events: [
        ...prev.events,
        {
          type: EventType.OTHER,
          description: "",
          daysFromStart: 0,
          isAllDay: false,
        },
      ],
    }));
  };

  const removeEvent = (index: number) => {
    setNewTemplate((prev) => ({
      ...prev,
      events: prev.events.filter((_, i) => i !== index),
    }));
  };

  const updateEvent = (
    index: number,
    field: keyof EventTemplate,
    value: any
  ) => {
    setNewTemplate((prev) => ({
      ...prev,
      events: prev.events.map((event, i) =>
        i === index ? { ...event, [field]: value } : event
      ),
    }));
  };

  const handleEventUpdate = (
    index: number,
    updates: Partial<EventTemplate>
  ) => {
    setNewTemplate((prev) => ({
      ...prev,
      events: prev.events.map((event, i) =>
        i === index ? { ...event, ...updates } : event
      ),
    }));
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    setNewTemplate((prev) => {
      const newEvents = [...prev.events];
      const [movedEvent] = newEvents.splice(fromIndex, 1);
      newEvents.splice(toIndex, 0, movedEvent);
      return { ...prev, events: newEvents };
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const draggedIndex = parseInt(e.dataTransfer.getData("text/plain"));
    if (draggedIndex !== index) {
      const element = e.currentTarget as HTMLElement;
      element.style.transform = "translateY(2px)";
    }
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
        <Button variant="outline" className="whitespace-nowrap">
          <Settings2 className="w-4 h-4 mr-2" />
          Manage Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[90vw] max-w-[1000px] h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            {editingTemplate ? "Edit Template" : "Manage Event Templates"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-6">
            {/* Template List */}
            {!editingTemplate && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Existing Templates</h3>
                  <Button
                    onClick={() => setEditingTemplate("")}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Template
                  </Button>
                </div>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Events</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(templates).map(([name, template]) => (
                        <TableRow key={name}>
                          <TableCell className="font-medium">{name}</TableCell>
                          <TableCell>{template.events.length} events</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => startEditing(name)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => duplicateTemplate(name)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteTemplate(name)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Create/Edit template section */}
            {editingTemplate !== null && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">
                    {editingTemplate ? "Edit Template" : "Create New Template"}
                  </h3>
                  <Button variant="outline" size="sm" onClick={cancelEditing}>
                    Cancel
                  </Button>
                </div>

                <div className="space-y-4">
                  <Input
                    placeholder="Template Name"
                    value={newTemplate.name}
                    onChange={(e) =>
                      setNewTemplate((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />

                  <div className="space-y-2">
                    {newTemplate.events.map((event, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-[auto_180px_1fr_120px_120px_auto] gap-2 items-start p-2 rounded-lg border bg-card transition-all"
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
                          value={event.type}
                          onValueChange={(value) =>
                            updateEvent(index, "type", value as EventType)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(EventType).map((type) => (
                              <SelectItem key={type} value={type}>
                                {formatEventType(type)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Description"
                          value={event.description}
                          onChange={(e) =>
                            updateEvent(index, "description", e.target.value)
                          }
                        />
                        <Input
                          type="number"
                          placeholder="Days from start"
                          value={event.daysFromStart}
                          onChange={(e) =>
                            updateEvent(
                              index,
                              "daysFromStart",
                              parseInt(e.target.value)
                            )
                          }
                        />
                        <Input
                          type="number"
                          placeholder="Duration (days)"
                          value={event.daysUntilEnd}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            updateEvent(index, "daysUntilEnd", value);
                            updateEvent(index, "hasEndDate", value > 0);
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEvent(index)}
                          className="text-destructive-500 hover:text-destructive-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <Button onClick={addEvent} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Event
                    </Button>
                  </div>

                  {newTemplate.events.length > 0 && (
                    <div className="mt-8">
                      <h4 className="text-sm font-medium mb-2">
                        Timeline Preview
                      </h4>
                      <EventTemplateGantt
                        template={newTemplate}
                        onEventUpdate={handleEventUpdate}
                        onReorder={handleReorder}
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 mt-4">
                    <Button onClick={saveTemplate}>
                      {editingTemplate ? "Update Template" : "Save Template"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
