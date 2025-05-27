"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { PlusCircle, Edit, Trash2, Settings } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { SystemPrompt } from "@/app/api/system-prompts/route";

const SystemPromptsContent: React.FC = () => {
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    prompt: "",
    type: "",
    isActive: false,
  });

  useEffect(() => {
    fetchSystemPrompts();
  }, []);

  const fetchSystemPrompts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/system-prompts");
      if (!response.ok) {
        throw new Error("Failed to fetch system prompts");
      }
      const data = await response.json();
      setSystemPrompts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingPrompt(null);
    setFormData({
      name: "",
      description: "",
      prompt: "",
      type: "",
      isActive: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prompt: SystemPrompt) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      description: prompt.description,
      prompt: prompt.prompt,
      type: prompt.type || "",
      isActive: prompt.isActive,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPrompt(null);
    setFormData({
      name: "",
      description: "",
      prompt: "",
      type: "",
      isActive: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = "/api/system-prompts";
      const method = editingPrompt ? "PUT" : "POST";

      const body = editingPrompt
        ? { id: editingPrompt._id, ...formData }
        : { ...formData };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save system prompt");
      }

      toast({
        title: "Success",
        description: `System prompt ${editingPrompt ? "updated" : "created"} successfully`,
      });

      await fetchSystemPrompts();
      handleCloseModal();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (prompt: SystemPrompt) => {
    if (!confirm(`Are you sure you want to delete "${prompt.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/system-prompts?id=${prompt._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete system prompt");
      }

      toast({
        title: "Success",
        description: "System prompt deleted successfully",
      });

      await fetchSystemPrompts();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (prompt: SystemPrompt) => {
    try {
      const response = await fetch("/api/system-prompts", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: prompt._id,
          name: prompt.name,
          description: prompt.description,
          prompt: prompt.prompt,
          type: prompt.type,
          isActive: !prompt.isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update system prompt");
      }

      toast({
        title: "Success",
        description: `System prompt ${!prompt.isActive ? "activated" : "deactivated"}`,
      });

      await fetchSystemPrompts();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const getTypeLabel = (type: string) => {
    if (!type) return "General";
    switch (type) {
      case "car_caption":
        return "Car Caption";
      case "project_caption":
        return "Project Caption";
      default:
        return type;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    if (!type) return "outline";
    switch (type) {
      case "car_caption":
        return "default";
      case "project_caption":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading system prompts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          <p className="font-semibold">Error loading system prompts</p>
          <p className="text-sm">{error}</p>
          <Button
            onClick={fetchSystemPrompts}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">System Prompt Settings</h2>
          <p className="text-muted-foreground">
            Manage the system prompts used for AI caption generation
          </p>
        </div>
        <Button onClick={handleOpenAddModal} disabled={isSubmitting}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add System Prompt
        </Button>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>All System Prompts</CardTitle>
            <CardDescription>
              Unified collection of system prompts for both cars and projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            {systemPrompts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No system prompts found. Create your first system prompt to get
                started.
              </p>
            ) : (
              <div className="space-y-4">
                {systemPrompts.map((prompt) => (
                  <div
                    key={prompt._id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{prompt.name}</h3>
                        <Badge variant={getTypeBadgeVariant(prompt.type || "")}>
                          {getTypeLabel(prompt.type || "")}
                        </Badge>
                        {prompt.isActive && (
                          <Badge variant="default">Active</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {prompt.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {prompt.prompt.length > 100
                          ? `${prompt.prompt.substring(0, 100)}...`
                          : prompt.prompt}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={prompt.isActive}
                        onCheckedChange={() => handleToggleActive(prompt)}
                        disabled={isSubmitting}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditModal(prompt)}
                        disabled={isSubmitting}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(prompt)}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPrompt ? "Edit System Prompt" : "Add System Prompt"}
            </DialogTitle>
            <DialogDescription>
              {editingPrompt
                ? "Update the system prompt settings"
                : "Create a new system prompt for AI caption generation"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Default Car Caption System Prompt"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of this system prompt"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type (Optional)</Label>
              <Select
                value={formData.type || "none"}
                onValueChange={(value: string) =>
                  setFormData({
                    ...formData,
                    type: value === "none" ? "" : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    General (No specific type)
                  </SelectItem>
                  <SelectItem value="car_caption">
                    Car Caption (Legacy)
                  </SelectItem>
                  <SelectItem value="project_caption">
                    Project Caption (Legacy)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Type is now optional. All prompts are available to both cars and
                projects.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">System Prompt</Label>
              <Textarea
                id="prompt"
                value={formData.prompt}
                onChange={(e) =>
                  setFormData({ ...formData, prompt: e.target.value })
                }
                placeholder="Enter the system prompt that will be used for AI caption generation..."
                rows={10}
                className="font-mono text-sm"
                required
              />
              <p className="text-xs text-muted-foreground">
                This prompt will be sent to the AI model to guide caption
                generation.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="isActive">Set as active prompt</Label>
              <p className="text-xs text-muted-foreground">
                (Only one prompt per type can be active)
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? editingPrompt
                    ? "Updating..."
                    : "Creating..."
                  : editingPrompt
                    ? "Update Prompt"
                    : "Create Prompt"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SystemPromptsContent;
