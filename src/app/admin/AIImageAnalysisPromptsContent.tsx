"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useAPI } from "@/hooks/useAPI";
import { getAllModels, llmProviders } from "@/lib/llmProviders";

interface AIImageAnalysisPrompt {
  _id: string;
  name: string;
  description: string;
  analysisType: "alt" | "caption" | "both";
  systemPrompt: string;
  userPromptTemplate: string;
  aiModel: string;
  llmProvider: string;
  isDefault: boolean;
  isActive: boolean;
  modelParams?: {
    temperature?: number;
    maxTokens?: number;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

const AIImageAnalysisPromptsContent: React.FC = () => {
  const [prompts, setPrompts] = useState<AIImageAnalysisPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] =
    useState<AIImageAnalysisPrompt | null>(null);
  const [deleteConfirmPrompt, setDeleteConfirmPrompt] =
    useState<AIImageAnalysisPrompt | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    analysisType: "both" as "alt" | "caption" | "both",
    systemPrompt: "",
    userPromptTemplate: "",
    aiModel: "gpt-4o-mini",
    llmProvider: "openai",
    isDefault: false,
    isActive: true,
    modelParams: {
      temperature: 0.7,
      maxTokens: 100,
    },
  });

  const api = useAPI();

  // Fetch prompts
  const fetchPrompts = async () => {
    if (!api) return;

    try {
      setIsLoading(true);
      const data = (await api.get(
        "/api/ai-image-analysis-prompts"
      )) as AIImageAnalysisPrompt[];
      setPrompts(data);
    } catch (error) {
      console.error("Error fetching prompts:", error);
      toast.error("Failed to load prompts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (api) {
      fetchPrompts();
    }
  }, [api]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !api) return;

    try {
      setIsSubmitting(true);

      if (editingPrompt) {
        await api.put("/api/ai-image-analysis-prompts", {
          _id: editingPrompt._id,
          ...formData,
        });
      } else {
        await api.post("/api/ai-image-analysis-prompts", formData);
      }

      toast.success(
        editingPrompt
          ? "Prompt updated successfully"
          : "Prompt created successfully"
      );

      await fetchPrompts();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving prompt:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save prompt"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (prompt: AIImageAnalysisPrompt) => {
    if (isSubmitting || !api) return;

    try {
      setIsSubmitting(true);

      await api.delete(`/api/ai-image-analysis-prompts?id=${prompt._id}`);

      toast.success("Prompt deleted successfully");
      await fetchPrompts();
      setDeleteConfirmPrompt(null);
    } catch (error) {
      console.error("Error deleting prompt:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete prompt"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modal handlers
  const handleOpenAddModal = () => {
    setEditingPrompt(null);
    setFormData({
      name: "",
      description: "",
      analysisType: "both",
      systemPrompt: "",
      userPromptTemplate: "",
      aiModel: "gpt-4o-mini",
      llmProvider: "openai",
      isDefault: false,
      isActive: true,
      modelParams: {
        temperature: 0.7,
        maxTokens: 100,
      },
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prompt: AIImageAnalysisPrompt) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      description: prompt.description,
      analysisType: prompt.analysisType,
      systemPrompt: prompt.systemPrompt,
      userPromptTemplate: prompt.userPromptTemplate,
      aiModel: prompt.aiModel,
      llmProvider: prompt.llmProvider,
      isDefault: prompt.isDefault,
      isActive: prompt.isActive,
      modelParams: {
        temperature: prompt.modelParams?.temperature || 0.7,
        maxTokens: prompt.modelParams?.maxTokens || 100,
      },
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPrompt(null);
  };

  // Get available models for the selected provider
  const getAvailableModels = () => {
    const provider =
      llmProviders[formData.llmProvider as keyof typeof llmProviders];
    return provider ? provider.models : [];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading prompts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Image Analysis Prompts</h2>
          <p className="text-muted-foreground">
            Manage prompts for AI-powered alt text and caption generation
          </p>
        </div>
        <Button onClick={handleOpenAddModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Prompt
        </Button>
      </div>

      <div className="grid gap-4">
        {prompts.map((prompt) => (
          <Card key={prompt._id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {prompt.name}
                    <Badge
                      variant={
                        prompt.analysisType === "both" ? "default" : "secondary"
                      }
                    >
                      {prompt.analysisType}
                    </Badge>
                    {prompt.isDefault && (
                      <Badge variant="outline">Default</Badge>
                    )}
                    {!prompt.isActive && (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{prompt.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEditModal(prompt)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirmPrompt(prompt)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Model:</strong> {prompt.aiModel} ({prompt.llmProvider}
                  )
                </div>
                <div>
                  <strong>System Prompt:</strong>
                  <div className="bg-muted p-2 rounded mt-1 text-xs max-h-20 overflow-y-auto">
                    {prompt.systemPrompt}
                  </div>
                </div>
                <div>
                  <strong>User Prompt Template:</strong>
                  <div className="bg-muted p-2 rounded mt-1 text-xs max-h-20 overflow-y-auto">
                    {prompt.userPromptTemplate}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPrompt ? "Edit Prompt" : "Add New Prompt"}
            </DialogTitle>
            <DialogDescription>
              Configure an AI prompt for image analysis
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="analysisType">Analysis Type</Label>
                <Select
                  value={formData.analysisType}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      analysisType: value as "alt" | "caption" | "both",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alt">Alt Text Only</SelectItem>
                    <SelectItem value="caption">Caption Only</SelectItem>
                    <SelectItem value="both">
                      Both Alt Text & Caption
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="llmProvider">LLM Provider</Label>
                <Select
                  value={formData.llmProvider}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      llmProvider: value,
                      aiModel: "",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(llmProviders).map((provider) => (
                      <SelectItem key={provider} value={provider}>
                        {
                          llmProviders[provider as keyof typeof llmProviders]
                            .name
                        }
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="aiModel">AI Model</Label>
                <Select
                  value={formData.aiModel}
                  onValueChange={(value) =>
                    setFormData({ ...formData, aiModel: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableModels().map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="systemPrompt">System Prompt</Label>
              <Textarea
                id="systemPrompt"
                value={formData.systemPrompt}
                onChange={(e) =>
                  setFormData({ ...formData, systemPrompt: e.target.value })
                }
                rows={6}
                placeholder="Enter the system prompt that defines the AI's role and behavior..."
                required
              />
            </div>

            <div>
              <Label htmlFor="userPromptTemplate">User Prompt Template</Label>
              <Textarea
                id="userPromptTemplate"
                value={formData.userPromptTemplate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    userPromptTemplate: e.target.value,
                  })
                }
                rows={4}
                placeholder="Enter the user prompt template. Use {contextString} as a placeholder for the context..."
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {`{contextString}`} as a placeholder for the image context
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={formData.modelParams.temperature}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      modelParams: {
                        ...formData.modelParams,
                        temperature: parseFloat(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.modelParams.maxTokens}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      modelParams: {
                        ...formData.modelParams,
                        maxTokens: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isDefault: checked })
                  }
                />
                <Label htmlFor="isDefault">Set as Default</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Save className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={!!deleteConfirmPrompt}
        onOpenChange={() => setDeleteConfirmPrompt(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Prompt</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirmPrompt?.name}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmPrompt(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteConfirmPrompt && handleDelete(deleteConfirmPrompt)
              }
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <X className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIImageAnalysisPromptsContent;
