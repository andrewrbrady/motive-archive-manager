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
import { LoadingSpinner } from "@/components/ui/loading";
import { LoadingContainer } from "@/components/ui/loading-container";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAPI } from "@/hooks/useAPI";

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

interface ScriptTemplatesResponse {
  data?: Template[];
  templates?: Template[];
  // Support both possible response formats
}

interface ScriptTemplateResponse {
  id: string;
  name: string;
  description: string;
  platforms: Platform[];
  aspectRatio: AspectRatio;
  rows: ScriptRow[];
  createdAt: string;
  updatedAt: string;
}

interface ScriptTemplatesTabProps {
  shouldCreateTemplate?: boolean;
}

export default function ScriptTemplatesTab({
  shouldCreateTemplate = false,
}: ScriptTemplatesTabProps) {
  const api = useAPI();
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
    if (api) {
      fetchTemplates();
    }
  }, [api]);

  useEffect(() => {
    const templateId = searchParams?.get("template");
    if (templateId && templates.length > 0) {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        setSelectedTemplate({
          ...template,
          platforms: template.platforms || [],
        });
      }
    }
  }, [searchParams, templates]);

  useEffect(() => {
    if (shouldCreateTemplate && !isCreating) {
      setIsCreating(true);
    }
  }, [shouldCreateTemplate]);

  // Authentication check
  if (!api) {
    return <LoadingContainer />;
  }

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const response =
        await api.get<ScriptTemplatesResponse>("script-templates");

      // Handle different possible response formats
      const templatesData = response.data || response.templates || response;
      const templatesArray = Array.isArray(templatesData) ? templatesData : [];

      setTemplates(templatesArray);

      // REMOVING THIS: Don't automatically select first template
      // Only select from URL parameter if it exists
      if (templatesArray.length > 0 && searchParams?.get("template")) {
        const templateFromUrl = templatesArray.find(
          (t: Template) => t.id === searchParams.get("template")
        );
        if (templateFromUrl) {
          setSelectedTemplate(templateFromUrl);
        }
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
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("template", template.id);
    router.push(`?${params.toString()}`);
  };

  const handleSubmit = async (data: Partial<Template>) => {
    try {
      const body = editingTemplate ? { ...data, id: editingTemplate.id } : data;

      let response: ScriptTemplateResponse;
      if (editingTemplate) {
        response = await api.put<ScriptTemplateResponse>(
          "script-templates",
          body
        );
      } else {
        response = await api.post<ScriptTemplateResponse>(
          "script-templates",
          body
        );
      }

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
      await api.delete(`script-templates/${templateId}`);

      await fetchTemplates();
      toast.success("Template deleted successfully");

      // Clear selected template if it was the deleted one
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
      }
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

  const handleCancelEdit = () => {
    setEditingTemplate(null);
    setIsCreating(false);
    form.reset();
  };

  const handleAddRow = () => {
    const currentRows = form.getValues("rows") || [];
    const newRow: ScriptRow = {
      id: Math.random().toString(36).substr(2, 9),
      time: "",
      video: "",
      audio: "",
      gfx: "",
    };
    form.setValue("rows", [...currentRows, newRow]);

    // Update selected template state
    if (selectedTemplate && editingTemplate?.id === selectedTemplate.id) {
      setSelectedTemplate({
        ...selectedTemplate,
        rows: [...currentRows, newRow],
      });
    }
  };

  const handleRemoveRow = (index: number) => {
    const currentRows = form.getValues("rows") || [];
    const updatedRows = currentRows.filter((_, i) => i !== index);
    form.setValue("rows", updatedRows);

    // Update selected template state
    if (selectedTemplate && editingTemplate?.id === selectedTemplate.id) {
      setSelectedTemplate({
        ...selectedTemplate,
        rows: updatedRows,
      });
    }
  };

  const handleDuplicate = async (template: Template) => {
    try {
      const { id, createdAt, updatedAt, ...templateData } = template;
      const response = await api.post<ScriptTemplateResponse>(
        "script-templates",
        {
          ...templateData,
          name: `${templateData.name} (Copy)`,
        }
      );

      await fetchTemplates();
      toast.success("Template duplicated successfully");
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast.error("Failed to duplicate template");
    }
  };

  const handleRowChange = (
    index: number,
    field: keyof ScriptRow,
    value: string
  ) => {
    const currentRows = form.getValues("rows") || [];
    const updatedRows = [...currentRows];
    updatedRows[index] = {
      ...updatedRows[index],
      [field]: value,
    };
    form.setValue("rows", updatedRows);

    // Update selected template state
    if (selectedTemplate && editingTemplate?.id === selectedTemplate.id) {
      setSelectedTemplate({
        ...selectedTemplate,
        rows: updatedRows,
      });
    }
  };

  return (
    <div className="space-y-6">
      {!isCreating && !editingTemplate && (
        <div className="flex gap-2 mb-4">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsCreating(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add Template</TooltipContent>
            </Tooltip>

            {selectedTemplate && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(selectedTemplate)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit Template</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDuplicate(selectedTemplate)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Duplicate Template</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(selectedTemplate.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete Template</TooltipContent>
                </Tooltip>
              </>
            )}
          </TooltipProvider>
        </div>
      )}

      <div className="flex justify-between items-center">
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <div className="hidden">
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
          </div>
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
        <LoadingContainer />
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
                                  <th className="px-3 py-2 text-left border-b border-r border-[hsl(var(--border))] font-medium text-sm">
                                    GFX
                                  </th>
                                  {editingTemplate?.id ===
                                    selectedTemplate.id && (
                                    <th className="w-10 px-2 py-2 border-b border-[hsl(var(--border))]"></th>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {selectedTemplate.rows.map((row, index) => (
                                  <tr
                                    key={row.id || index}
                                    className="border-b border-[hsl(var(--border))]"
                                  >
                                    <td className="px-3 py-2 border-r border-[hsl(var(--border))]">
                                      {editingTemplate?.id ===
                                      selectedTemplate.id ? (
                                        <Input
                                          value={row.time}
                                          onChange={(e) =>
                                            handleRowChange(
                                              index,
                                              "time",
                                              e.target.value
                                            )
                                          }
                                          className="h-7 bg-transparent border-0 p-0 focus-visible:ring-0 placeholder:text-[hsl(var(--foreground-muted))]"
                                        />
                                      ) : (
                                        <span className="text-sm">
                                          {row.time}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 border-r border-[hsl(var(--border))]">
                                      {editingTemplate?.id ===
                                      selectedTemplate.id ? (
                                        <Input
                                          value={row.video}
                                          onChange={(e) =>
                                            handleRowChange(
                                              index,
                                              "video",
                                              e.target.value
                                            )
                                          }
                                          className="h-7 bg-transparent border-0 p-0 focus-visible:ring-0 placeholder:text-[hsl(var(--foreground-muted))]"
                                        />
                                      ) : (
                                        <span className="text-sm">
                                          {row.video}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 border-r border-[hsl(var(--border))]">
                                      {editingTemplate?.id ===
                                      selectedTemplate.id ? (
                                        <Input
                                          value={row.audio}
                                          onChange={(e) =>
                                            handleRowChange(
                                              index,
                                              "audio",
                                              e.target.value
                                            )
                                          }
                                          className="h-7 bg-transparent border-0 p-0 focus-visible:ring-0 placeholder:text-[hsl(var(--foreground-muted))]"
                                        />
                                      ) : (
                                        <span className="text-sm">
                                          {row.audio}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 border-r border-[hsl(var(--border))]">
                                      {editingTemplate?.id ===
                                      selectedTemplate.id ? (
                                        <Input
                                          value={row.gfx}
                                          onChange={(e) =>
                                            handleRowChange(
                                              index,
                                              "gfx",
                                              e.target.value
                                            )
                                          }
                                          className="h-7 bg-transparent border-0 p-0 focus-visible:ring-0 placeholder:text-[hsl(var(--foreground-muted))]"
                                        />
                                      ) : (
                                        <span className="text-sm">
                                          {row.gfx}
                                        </span>
                                      )}
                                    </td>
                                    {editingTemplate?.id ===
                                      selectedTemplate.id && (
                                      <td className="px-2 py-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleRemoveRow(index)}
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
                                      colSpan={
                                        editingTemplate?.id ===
                                        selectedTemplate.id
                                          ? 5
                                          : 4
                                      }
                                      className="px-3 py-4 text-center text-sm text-[hsl(var(--foreground-muted))]"
                                    >
                                      No rows yet.{" "}
                                      {editingTemplate?.id ===
                                        selectedTemplate.id &&
                                        "Click 'Add Row' to get started."}
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {editingTemplate?.id === selectedTemplate.id && (
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
                            {(selectedTemplate.platforms || [])
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
                              {editingTemplate?.id === selectedTemplate.id && (
                                <th className="w-10 px-2 py-2 border-b border-[hsl(var(--border))]"></th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {selectedTemplate.rows.map((row, index) => (
                              <tr
                                key={row.id || index}
                                className="border-b border-[hsl(var(--border))]"
                              >
                                <td className="px-3 py-2 border-r border-[hsl(var(--border))]">
                                  {editingTemplate?.id ===
                                  selectedTemplate.id ? (
                                    <Input
                                      value={row.time}
                                      onChange={(e) =>
                                        handleRowChange(
                                          index,
                                          "time",
                                          e.target.value
                                        )
                                      }
                                      className="h-7 bg-transparent border-0 p-0 focus-visible:ring-0 placeholder:text-[hsl(var(--foreground-muted))]"
                                    />
                                  ) : (
                                    <span className="text-sm">{row.time}</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 border-r border-[hsl(var(--border))]">
                                  {editingTemplate?.id ===
                                  selectedTemplate.id ? (
                                    <Input
                                      value={row.video}
                                      onChange={(e) =>
                                        handleRowChange(
                                          index,
                                          "video",
                                          e.target.value
                                        )
                                      }
                                      className="h-7 bg-transparent border-0 p-0 focus-visible:ring-0 placeholder:text-[hsl(var(--foreground-muted))]"
                                    />
                                  ) : (
                                    <span className="text-sm">{row.video}</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 border-r border-[hsl(var(--border))]">
                                  {editingTemplate?.id ===
                                  selectedTemplate.id ? (
                                    <Input
                                      value={row.audio}
                                      onChange={(e) =>
                                        handleRowChange(
                                          index,
                                          "audio",
                                          e.target.value
                                        )
                                      }
                                      className="h-7 bg-transparent border-0 p-0 focus-visible:ring-0 placeholder:text-[hsl(var(--foreground-muted))]"
                                    />
                                  ) : (
                                    <span className="text-sm">{row.audio}</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 border-r border-[hsl(var(--border))]">
                                  {editingTemplate?.id ===
                                  selectedTemplate.id ? (
                                    <Input
                                      value={row.gfx}
                                      onChange={(e) =>
                                        handleRowChange(
                                          index,
                                          "gfx",
                                          e.target.value
                                        )
                                      }
                                      className="h-7 bg-transparent border-0 p-0 focus-visible:ring-0 placeholder:text-[hsl(var(--foreground-muted))]"
                                    />
                                  ) : (
                                    <span className="text-sm">{row.gfx}</span>
                                  )}
                                </td>
                                {editingTemplate?.id ===
                                  selectedTemplate.id && (
                                  <td className="px-2 py-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveRow(index)}
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
                                  colSpan={
                                    editingTemplate?.id === selectedTemplate.id
                                      ? 5
                                      : 4
                                  }
                                  className="px-3 py-4 text-center text-sm text-[hsl(var(--foreground-muted))]"
                                >
                                  No rows yet.{" "}
                                  {editingTemplate?.id ===
                                    selectedTemplate.id &&
                                    "Click 'Add Row' to get started."}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {editingTemplate?.id === selectedTemplate.id && (
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
                  </>
                )}
              </div>
            ) : (
              <div className="text-center text-[hsl(var(--foreground-muted))]">
                Select a template from the list to view its details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
