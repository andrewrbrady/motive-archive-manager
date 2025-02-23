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
import { Plus, Edit, Trash2, Copy, Check, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type Platform = "instagram_reels" | "youtube_shorts" | "youtube" | "stream_otv";
type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5";

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

interface Template {
  id: string;
  name: string;
  description: string;
  platforms: Platform[];
  aspectRatio: AspectRatio;
  rows: ScriptRow[];
  createdAt: string;
  updatedAt: string;
}

export default function ScriptTemplatesTab() {
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
      platforms: [],
      aspectRatio: "16:9",
      rows: [],
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
      const response = await fetch("/api/script-templates");
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
        ? `/api/script-templates/${editingTemplate.id}`
        : "/api/script-templates";
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
      const response = await fetch(`/api/script-templates/${templateId}`, {
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
  };

  const handleCancelEdit = () => {
    setEditingTemplate(null);
    form.reset();
  };

  const handleAddRow = () => {
    const currentRows = form.getValues("rows") || [];
    form.setValue("rows", [
      ...currentRows,
      {
        id: crypto.randomUUID(),
        time: "",
        video: "",
        audio: "",
        gfx: "",
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    const currentRows = form.getValues("rows") || [];
    form.setValue(
      "rows",
      currentRows.filter((_, i) => i !== index)
    );
  };

  const handleDuplicate = async (template: Template) => {
    try {
      const { id, createdAt, updatedAt, ...templateData } = template;
      const response = await fetch("/api/script-templates", {
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
        <h3 className="text-lg font-medium">Script Templates</h3>
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
                          placeholder="e.g., 30 Second Commercial"
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Platforms</Label>
                    <div className="space-y-2">
                      {PLATFORMS.map((platform) => (
                        <div
                          key={platform.value}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            checked={form
                              .getValues("platforms")
                              ?.includes(platform.value)}
                            onCheckedChange={(checked) => {
                              const currentPlatforms =
                                form.getValues("platforms") || [];
                              form.setValue(
                                "platforms",
                                checked
                                  ? [...currentPlatforms, platform.value]
                                  : currentPlatforms.filter(
                                      (p) => p !== platform.value
                                    )
                              );
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
                      value={form.getValues("aspectRatio")}
                      onValueChange={(value: AspectRatio) =>
                        form.setValue("aspectRatio", value)
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
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Script Rows</Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddRow}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Row
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {form.watch("rows")?.map((_, index) => (
                      <div
                        key={index}
                        className="grid gap-4 p-4 border border-[hsl(var(--border))] rounded-lg"
                      >
                        <div className="flex justify-between items-center">
                          <h5 className="font-medium">Row {index + 1}</h5>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRow(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`rows.${index}.time`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Time</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="e.g., 0:00-0:05"
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`rows.${index}.video`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Video</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Describe the video content"
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`rows.${index}.audio`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Audio</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Describe the audio content"
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`rows.${index}.gfx`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Graphics</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Describe the graphics"
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit">
                    {editingTemplate ? "Save Changes" : "Create Template"}
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
        <div className="text-center py-4 text-[hsl(var(--foreground-muted))]">
          No templates yet. Create a new template to get started.
        </div>
      ) : (
        <div className="grid grid-cols-[300px,1fr] gap-6">
          {/* Template List */}
          <div className="border border-[hsl(var(--border))] rounded-lg">
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="p-2 space-y-1">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      selectedTemplate?.id === template.id
                        ? "bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
                        : "hover:bg-[hsl(var(--background))] bg-opacity-50 text-[hsl(var(--foreground-subtle))]"
                    }`}
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-[hsl(var(--foreground-muted))]">
                      {template.rows.length} rows
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Template Details */}
          <div className="border border-[hsl(var(--border))] rounded-lg p-6">
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

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Platforms</Label>
                          <div className="space-y-2">
                            {PLATFORMS.map((platform) => (
                              <div
                                key={platform.value}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  checked={form
                                    .getValues("platforms")
                                    ?.includes(platform.value)}
                                  onCheckedChange={(checked) => {
                                    const currentPlatforms =
                                      form.getValues("platforms") || [];
                                    form.setValue(
                                      "platforms",
                                      checked
                                        ? [...currentPlatforms, platform.value]
                                        : currentPlatforms.filter(
                                            (p) => p !== platform.value
                                          )
                                    );
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
                            value={form.getValues("aspectRatio")}
                            onValueChange={(value: AspectRatio) =>
                              form.setValue("aspectRatio", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ASPECT_RATIOS.map((ratio) => (
                                <SelectItem
                                  key={ratio.value}
                                  value={ratio.value}
                                >
                                  {ratio.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <Label>Script Rows</Label>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAddRow}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Row
                          </Button>
                        </div>
                        <div className="space-y-4">
                          {form.watch("rows")?.map((_, index) => (
                            <div
                              key={index}
                              className="grid gap-4 p-4 border border-[hsl(var(--border))] rounded-lg"
                            >
                              <div className="flex justify-between items-center">
                                <h5 className="font-medium">Row {index + 1}</h5>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveRow(index)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name={`rows.${index}.time`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Time</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder="e.g., 0:00-0:05"
                                          {...field}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`rows.${index}.video`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Video</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder="Describe the video content"
                                          {...field}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name={`rows.${index}.audio`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Audio</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder="Describe the audio content"
                                          {...field}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`rows.${index}.gfx`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Graphics</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder="Describe the graphics"
                                          {...field}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-xl font-medium">
                          {selectedTemplate.name}
                        </h2>
                        <p className="text-[hsl(var(--foreground-muted))] mt-1">
                          {selectedTemplate.description}
                        </p>
                        <div className="flex gap-4 mt-2">
                          <div className="text-sm text-[hsl(var(--foreground-muted))]">
                            Platforms:{" "}
                            {selectedTemplate.platforms
                              .map(
                                (p) =>
                                  PLATFORMS.find(
                                    (platform) => platform.value === p
                                  )?.label
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
                          className="text-destructive-500 hover:text-destructive-700 hover:bg-destructive-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Script Rows</h3>
                      <div className="grid gap-4">
                        {selectedTemplate.rows.map((row, index) => (
                          <div
                            key={row.id}
                            className="border border-[hsl(var(--border))] rounded-lg p-4"
                          >
                            <div className="grid grid-cols-[100px,1fr] gap-4">
                              <div className="font-medium">{row.time}</div>
                              <div className="space-y-2">
                                <div>
                                  <span className="font-medium">Video:</span>{" "}
                                  {row.video}
                                </div>
                                <div>
                                  <span className="font-medium">Audio:</span>{" "}
                                  {row.audio}
                                </div>
                                <div>
                                  <span className="font-medium">Graphics:</span>{" "}
                                  {row.gfx}
                                </div>
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
              <div className="text-center text-[hsl(var(--foreground-muted))]">
                Select a template to view its details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
