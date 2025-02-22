import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Copy, Plus, Trash2, Save, Edit2 } from "lucide-react";
import { toast } from "sonner";

interface ScriptRow {
  id: string;
  time: string;
  video: string;
  audio: string;
  gfx: string;
}

interface ScriptTemplate {
  _id?: string;
  name: string;
  description: string;
  rows: ScriptRow[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface ScriptTemplatesProps {
  onApplyTemplate: (template: ScriptTemplate) => void;
}

const DEFAULT_TEMPLATES: Omit<ScriptTemplate, "_id">[] = [
  {
    name: "6 Second Teaser",
    description:
      "Quick, impactful social media spot focusing on a single key feature or angle",
    rows: [
      {
        id: crypto.randomUUID(),
        time: "0:00-0:02",
        video: "Dynamic hero shot of car",
        audio: "Engine sound building",
        gfx: "Clean frame",
      },
      {
        id: crypto.randomUUID(),
        time: "0:02-0:04",
        video: "Feature highlight shot",
        audio: "Subtle background music",
        gfx: "Key feature callout",
      },
      {
        id: crypto.randomUUID(),
        time: "0:04-0:06",
        video: "End frame on beauty shot",
        audio: "Music swell and end",
        gfx: "Logo + Call to action",
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "15 Second Teaser",
    description:
      "Social media and pre-roll optimized spot showcasing key features and personality",
    rows: [
      {
        id: crypto.randomUUID(),
        time: "0:00-0:03",
        video: "Dynamic opening sequence",
        audio: "Dramatic engine sound + Music start",
        gfx: "Clean frame",
      },
      {
        id: crypto.randomUUID(),
        time: "0:03-0:06",
        video: "Feature sequence shot 1",
        audio: "Music building",
        gfx: "Feature highlight text",
      },
      {
        id: crypto.randomUUID(),
        time: "0:06-0:09",
        video: "Feature sequence shot 2",
        audio: "Music continuing",
        gfx: "Specs overlay",
      },
      {
        id: crypto.randomUUID(),
        time: "0:09-0:12",
        video: "Hero beauty shot",
        audio: "Music peak",
        gfx: "Brand message",
      },
      {
        id: crypto.randomUUID(),
        time: "0:12-0:15",
        video: "End frame",
        audio: "Music resolve",
        gfx: "Logo + Call to action",
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "30 Second Commercial",
    description:
      "Full commercial spot for TV and online, telling a complete story about the vehicle",
    rows: [
      {
        id: crypto.randomUUID(),
        time: "0:00-0:05",
        video: "Opening lifestyle/story setup",
        audio: "Music intro + Ambient sound",
        gfx: "Clean frame",
      },
      {
        id: crypto.randomUUID(),
        time: "0:05-0:10",
        video: "First feature highlight sequence",
        audio: "Music building + VO introducing feature",
        gfx: "Feature specs overlay",
      },
      {
        id: crypto.randomUUID(),
        time: "0:10-0:15",
        video: "Second feature sequence",
        audio: "Music continuing + VO feature details",
        gfx: "Technical specs",
      },
      {
        id: crypto.randomUUID(),
        time: "0:15-0:20",
        video: "Performance/driving sequence",
        audio: "Engine sounds + Music swell",
        gfx: "Performance stats",
      },
      {
        id: crypto.randomUUID(),
        time: "0:20-0:25",
        video: "Lifestyle/emotional payoff",
        audio: "Music peak + VO brand message",
        gfx: "Brand message",
      },
      {
        id: crypto.randomUUID(),
        time: "0:25-0:30",
        video: "End frame beauty shot",
        audio: "Music resolve + End tag",
        gfx: "Logo + Contact + Call to action",
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function ScriptTemplates({
  onApplyTemplate,
}: ScriptTemplatesProps) {
  const [templates, setTemplates] = useState<ScriptTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<ScriptTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const createDefaultTemplates = async () => {
    try {
      const results = await Promise.all(
        DEFAULT_TEMPLATES.map(async (template) => {
          const response = await fetch("/api/script-templates", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(template),
          });

          if (!response.ok) {
            throw new Error(`Failed to create template: ${template.name}`);
          }

          return response.json();
        })
      );

      setTemplates(results);
      setIsLoading(false);
    } catch (error) {
      console.error("Error creating default templates:", error);
      toast.error("Failed to create default templates");
      setIsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/script-templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();

      if (data.length === 0) {
        await createDefaultTemplates();
      } else {
        setTemplates(data);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to fetch templates");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleAddRow = () => {
    if (!selectedTemplate) return;

    const newRow: ScriptRow = {
      id: crypto.randomUUID(),
      time: "",
      video: "",
      audio: "",
      gfx: "",
    };

    setSelectedTemplate({
      ...selectedTemplate,
      rows: [...selectedTemplate.rows, newRow],
    });
  };

  const handleDeleteRow = (rowId: string) => {
    if (!selectedTemplate) return;

    setSelectedTemplate({
      ...selectedTemplate,
      rows: selectedTemplate.rows.filter((row) => row.id !== rowId),
    });
  };

  const handleRowChange = (
    rowId: string,
    field: keyof ScriptRow,
    value: string
  ) => {
    if (!selectedTemplate) return;

    setSelectedTemplate({
      ...selectedTemplate,
      rows: selectedTemplate.rows.map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row
      ),
    });
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      const method = selectedTemplate._id ? "PUT" : "POST";
      const response = await fetch("/api/script-templates", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(selectedTemplate),
      });

      if (!response.ok) throw new Error("Failed to save template");

      toast.success("Template saved successfully");
      await fetchTemplates();
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const response = await fetch(
        `/api/script-templates?templateId=${templateId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to delete template");

      toast.success("Template deleted successfully");
      await fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {/* Template List */}
        {!selectedTemplate && (
          <div className="grid gap-4">
            {isLoading ? (
              <div className="text-center py-4 text-neutral-400">
                Loading templates...
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-4 text-neutral-400">
                No templates available. Creating default templates...
              </div>
            ) : (
              templates.map((template) => (
                <div
                  key={template._id}
                  className="bg-neutral-900 border border-neutral-800 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {template.name}
                      </h4>
                      <p className="text-sm text-neutral-400 mt-1">
                        {template.description}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setIsEditing(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template._id!)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onApplyTemplate(template)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Use Template
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Template Editor */}
        {selectedTemplate && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-4">
                <Input
                  value={selectedTemplate.name}
                  onChange={(e) =>
                    setSelectedTemplate({
                      ...selectedTemplate,
                      name: e.target.value,
                    })
                  }
                  placeholder="Template Name"
                  className="text-lg font-medium bg-transparent border-0 p-0 focus-visible:ring-0 h-auto"
                  disabled={!isEditing}
                />
                <Input
                  value={selectedTemplate.description}
                  onChange={(e) =>
                    setSelectedTemplate({
                      ...selectedTemplate,
                      description: e.target.value,
                    })
                  }
                  placeholder="Template Description"
                  className="mt-1 text-sm text-neutral-400 bg-transparent border-0 p-0 focus-visible:ring-0 h-auto"
                  disabled={!isEditing}
                />
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveTemplate}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate(null);
                        setIsEditing(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </div>

            <div className="border border-neutral-800">
              <table className="w-full border-collapse">
                <thead className="bg-neutral-900">
                  <tr>
                    <th className="w-28 px-3 py-2 text-left border-b border-r border-neutral-800 font-medium text-sm">
                      Time
                    </th>
                    <th className="px-3 py-2 text-left border-b border-r border-neutral-800 font-medium text-sm">
                      Video
                    </th>
                    <th className="px-3 py-2 text-left border-b border-r border-neutral-800 font-medium text-sm">
                      Audio
                    </th>
                    <th className="px-3 py-2 text-left border-b border-neutral-800 font-medium text-sm">
                      GFX
                    </th>
                    {isEditing && (
                      <th className="w-10 px-2 py-2 border-b border-neutral-800"></th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {selectedTemplate.rows.map((row) => (
                    <tr key={row.id} className="border-b border-neutral-800">
                      <td className="px-3 py-2 border-r border-neutral-800">
                        {isEditing ? (
                          <Input
                            value={row.time}
                            onChange={(e) =>
                              handleRowChange(row.id, "time", e.target.value)
                            }
                            className="h-7 bg-transparent border-0 p-0 focus-visible:ring-0 placeholder:text-neutral-500"
                          />
                        ) : (
                          <span className="text-sm">{row.time}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 border-r border-neutral-800">
                        {isEditing ? (
                          <Input
                            value={row.video}
                            onChange={(e) =>
                              handleRowChange(row.id, "video", e.target.value)
                            }
                            className="h-7 bg-transparent border-0 p-0 focus-visible:ring-0 placeholder:text-neutral-500"
                          />
                        ) : (
                          <span className="text-sm">{row.video}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 border-r border-neutral-800">
                        {isEditing ? (
                          <Input
                            value={row.audio}
                            onChange={(e) =>
                              handleRowChange(row.id, "audio", e.target.value)
                            }
                            className="h-7 bg-transparent border-0 p-0 focus-visible:ring-0 placeholder:text-neutral-500"
                          />
                        ) : (
                          <span className="text-sm">{row.audio}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 border-r border-neutral-800">
                        {isEditing ? (
                          <Input
                            value={row.gfx}
                            onChange={(e) =>
                              handleRowChange(row.id, "gfx", e.target.value)
                            }
                            className="h-7 bg-transparent border-0 p-0 focus-visible:ring-0 placeholder:text-neutral-500"
                          />
                        ) : (
                          <span className="text-sm">{row.gfx}</span>
                        )}
                      </td>
                      {isEditing && (
                        <td className="px-2 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRow(row.id)}
                            className="h-7 px-2 hover:bg-neutral-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {(!selectedTemplate.rows ||
                    selectedTemplate.rows.length === 0) && (
                    <tr className="border-b border-neutral-800">
                      <td
                        colSpan={isEditing ? 5 : 4}
                        className="px-3 py-4 text-center text-sm text-neutral-500"
                      >
                        No rows yet.{" "}
                        {isEditing && "Click 'Add Row' to get started."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {isEditing && (
              <div className="p-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleAddRow}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Row
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
