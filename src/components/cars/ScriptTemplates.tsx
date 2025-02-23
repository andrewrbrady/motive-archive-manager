import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Copy, Plus, Trash2, Save, Edit2 } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type Platform =
  | "instagram_reels"
  | "youtube_shorts"
  | "youtube"
  | "stream_otv";
export type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5";

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "instagram_reels", label: "Instagram Reels" },
  { value: "youtube_shorts", label: "YouTube Shorts" },
  { value: "youtube", label: "YouTube" },
  { value: "stream_otv", label: "Stream/OTV" },
];

const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: "9:16", label: "9:16 (Vertical)" },
  { value: "16:9", label: "16:9 (Horizontal)" },
  { value: "1:1", label: "1:1 (Square)" },
  { value: "4:5", label: "4:5 (Instagram)" },
];

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
  platforms: Platform[];
  aspectRatio: AspectRatio;
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
    platforms: ["instagram_reels", "youtube_shorts"],
    aspectRatio: "9:16",
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
    platforms: ["youtube", "stream_otv"],
    aspectRatio: "16:9",
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
    platforms: ["youtube", "stream_otv"],
    aspectRatio: "16:9",
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
  {
    name: "60 Second Feature",
    description:
      "In-depth feature video highlighting all aspects of the vehicle",
    platforms: ["youtube"],
    aspectRatio: "16:9",
    rows: [
      {
        id: crypto.randomUUID(),
        time: "0:00-0:10",
        video: "Cinematic opening sequence",
        audio: "Atmospheric music + Natural sounds",
        gfx: "Clean frame",
      },
      {
        id: crypto.randomUUID(),
        time: "0:10-0:20",
        video: "Exterior walk-around",
        audio: "VO describing design + Music",
        gfx: "Design highlight callouts",
      },
      {
        id: crypto.randomUUID(),
        time: "0:20-0:30",
        video: "Interior showcase",
        audio: "VO highlighting features + Music",
        gfx: "Feature specs and details",
      },
      {
        id: crypto.randomUUID(),
        time: "0:30-0:40",
        video: "Performance/mechanical features",
        audio: "Engine sounds + VO + Music",
        gfx: "Technical specifications",
      },
      {
        id: crypto.randomUUID(),
        time: "0:40-0:50",
        video: "Driving footage",
        audio: "Engine/road sounds + Music swell",
        gfx: "Performance stats overlay",
      },
      {
        id: crypto.randomUUID(),
        time: "0:50-0:60",
        video: "Closing beauty shots",
        audio: "Music finale + End VO",
        gfx: "Final specs + Call to action",
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "Instagram Story Highlight",
    description: "Vertical format highlight reel for Instagram Stories",
    platforms: ["instagram_reels"],
    aspectRatio: "9:16",
    rows: [
      {
        id: crypto.randomUUID(),
        time: "0:00-0:03",
        video: "Opening hero shot",
        audio: "Music intro",
        gfx: "Vehicle name overlay",
      },
      {
        id: crypto.randomUUID(),
        time: "0:03-0:06",
        video: "Quick exterior details",
        audio: "Music building",
        gfx: "Spec highlights",
      },
      {
        id: crypto.randomUUID(),
        time: "0:06-0:09",
        video: "Interior showcase",
        audio: "Music continuing",
        gfx: "Feature callouts",
      },
      {
        id: crypto.randomUUID(),
        time: "0:09-0:12",
        video: "Final beauty shot",
        audio: "Music peak and end",
        gfx: "Call to action",
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
          const templateWithDefaults = {
            ...template,
            platforms: template.platforms || [],
            aspectRatio: template.aspectRatio || "16:9",
          };

          const response = await fetch("/api/script-templates", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(templateWithDefaults),
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
              <div className="text-center py-4 text-[hsl(var(--foreground-muted))]">
                Loading templates...
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-4 text-[hsl(var(--foreground-muted))]">
                No templates available. Creating default templates...
              </div>
            ) : (
              templates.map((template) => (
                <div
                  key={template._id}
                  className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {template.name}
                      </h4>
                      <p className="text-sm text-[hsl(var(--foreground-muted))] mt-1">
                        {template.description}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate({
                            ...template,
                            platforms: template.platforms || [],
                            aspectRatio: template.aspectRatio || "16:9",
                          });
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
                        onClick={() =>
                          onApplyTemplate({
                            ...template,
                            platforms: template.platforms || [],
                            aspectRatio: template.aspectRatio || "16:9",
                          })
                        }
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
              <div className="flex-1 mr-4 space-y-4">
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
                  className="text-sm text-[hsl(var(--foreground-muted))] bg-transparent border-0 p-0 focus-visible:ring-0 h-auto"
                  disabled={!isEditing}
                />

                {isEditing && (
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="space-y-2">
                      <Label>Platforms</Label>
                      <div className="space-y-2">
                        {PLATFORMS.map((platform) => (
                          <div
                            key={platform.value}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              checked={selectedTemplate.platforms.includes(
                                platform.value
                              )}
                              onCheckedChange={(checked) => {
                                setSelectedTemplate({
                                  ...selectedTemplate,
                                  platforms: checked
                                    ? [
                                        ...selectedTemplate.platforms,
                                        platform.value,
                                      ]
                                    : selectedTemplate.platforms.filter(
                                        (p) => p !== platform.value
                                      ),
                                });
                              }}
                            />
                            <Label>{platform.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Aspect Ratio</Label>
                      <Select
                        value={selectedTemplate.aspectRatio}
                        onValueChange={(value: AspectRatio) =>
                          setSelectedTemplate({
                            ...selectedTemplate,
                            aspectRatio: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASPECT_RATIOS.map((ratio) => (
                            <SelectItem key={ratio.value} value={ratio.value}>
                              {ratio.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {!isEditing && (
                  <div className="flex gap-2 pt-2">
                    <div className="text-sm text-[hsl(var(--foreground-muted))]">
                      Platforms:{" "}
                      {selectedTemplate.platforms
                        .map(
                          (p) =>
                            PLATFORMS.find((platform) => platform.value === p)
                              ?.label
                        )
                        .join(", ")}
                    </div>
                    <div className="text-sm text-[hsl(var(--foreground-muted))]">
                      Aspect Ratio:{" "}
                      {
                        ASPECT_RATIOS.find(
                          (ratio) =>
                            ratio.value === selectedTemplate.aspectRatio
                        )?.label
                      }
                    </div>
                  </div>
                )}
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

            <div className="border border-[hsl(var(--border))]">
              <table className="w-full border-collapse">
                <thead className="bg-[hsl(var(--background))]">
                  <tr>
                    <th className="w-28 px-3 py-2 text-left border-b border-r border-[hsl(var(--border))] font-medium text-sm">
                      Time
                    </th>
                    <th className="px-3 py-2 text-left border-b border-r border-[hsl(var(--border))] font-medium text-sm">
                      Video
                    </th>
                    <th className="px-3 py-2 text-left border-b border-r border-[hsl(var(--border))] font-medium text-sm">
                      Audio
                    </th>
                    <th className="px-3 py-2 text-left border-b border-[hsl(var(--border))] font-medium text-sm">
                      GFX
                    </th>
                    {isEditing && (
                      <th className="w-10 px-2 py-2 border-b border-[hsl(var(--border))]"></th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {selectedTemplate.rows.map((row) => (
                    <tr key={row.id} className="border-b border-[hsl(var(--border))]">
                      <td className="px-3 py-2 border-r border-[hsl(var(--border))]">
                        {isEditing ? (
                          <Input
                            value={row.time}
                            onChange={(e) =>
                              handleRowChange(row.id, "time", e.target.value)
                            }
                            className="h-7 bg-transparent border-0 p-0 focus-visible:ring-0 placeholder:text-[hsl(var(--foreground-muted))]"
                          />
                        ) : (
                          <span className="text-sm">{row.time}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 border-r border-[hsl(var(--border))]">
                        {isEditing ? (
                          <Input
                            value={row.video}
                            onChange={(e) =>
                              handleRowChange(row.id, "video", e.target.value)
                            }
                            className="h-7 bg-transparent border-0 p-0 focus-visible:ring-0 placeholder:text-[hsl(var(--foreground-muted))]"
                          />
                        ) : (
                          <span className="text-sm">{row.video}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 border-r border-[hsl(var(--border))]">
                        {isEditing ? (
                          <Input
                            value={row.audio}
                            onChange={(e) =>
                              handleRowChange(row.id, "audio", e.target.value)
                            }
                            className="h-7 bg-transparent border-0 p-0 focus-visible:ring-0 placeholder:text-[hsl(var(--foreground-muted))]"
                          />
                        ) : (
                          <span className="text-sm">{row.audio}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 border-r border-[hsl(var(--border))]">
                        {isEditing ? (
                          <Input
                            value={row.gfx}
                            onChange={(e) =>
                              handleRowChange(row.id, "gfx", e.target.value)
                            }
                            className="h-7 bg-transparent border-0 p-0 focus-visible:ring-0 placeholder:text-[hsl(var(--foreground-muted))]"
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
                            className="h-7 px-2 hover:bg-[hsl(var(--background))]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {(!selectedTemplate.rows ||
                    selectedTemplate.rows.length === 0) && (
                    <tr className="border-b border-[hsl(var(--border))]">
                      <td
                        colSpan={isEditing ? 5 : 4}
                        className="px-3 py-4 text-center text-sm text-[hsl(var(--foreground-muted))]"
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
