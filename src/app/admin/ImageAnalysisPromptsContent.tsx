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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

interface ImageAnalysisPrompt {
  _id: string;
  name: string;
  description: string;
  prompt: string;
  isDefault: boolean;
  isActive: boolean;
  category: string;
  createdAt: string;
  updatedAt: string;
}

const ImageAnalysisPromptsContent: React.FC = () => {
  const { user } = useFirebaseAuth();
  const [prompts, setPrompts] = useState<ImageAnalysisPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] =
    useState<ImageAnalysisPrompt | null>(null);
  const [deleteConfirmPrompt, setDeleteConfirmPrompt] =
    useState<ImageAnalysisPrompt | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    prompt: "",
    isDefault: false,
    isActive: true,
    category: "general",
  });

  // Helper function to get auth headers
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    if (!user) return {};
    try {
      const token = await user.getIdToken();
      return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
    } catch (error) {
      console.error("Error getting auth token:", error);
      return {};
    }
  };

  // Fetch prompts
  const fetchPrompts = async () => {
    if (!user) return; // Wait for user to be available

    try {
      setIsLoading(true);
      const headers = await getAuthHeaders();
      if (Object.keys(headers).length === 0) {
        throw new Error("No authentication token available");
      }

      const response = await fetch("/api/admin/image-analysis-prompts", {
        headers,
      });
      if (!response.ok) throw new Error("Failed to fetch prompts");
      const data = await response.json();
      setPrompts(data);
    } catch (error) {
      console.error("Error fetching prompts:", error);
      toast.error("Failed to load prompts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPrompts();
    }
  }, [user]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const url = editingPrompt
        ? `/api/admin/image-analysis-prompts/${editingPrompt._id}`
        : "/api/admin/image-analysis-prompts";

      const method = editingPrompt ? "PUT" : "POST";

      const headers = await getAuthHeaders();
      if (Object.keys(headers).length === 0) {
        throw new Error("No authentication token available");
      }

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save prompt");
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
  const handleDelete = async (prompt: ImageAnalysisPrompt) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const headers = await getAuthHeaders();
      if (Object.keys(headers).length === 0) {
        throw new Error("No authentication token available");
      }

      const response = await fetch(
        `/api/admin/image-analysis-prompts/${prompt._id}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete prompt");
      }

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

  // Handle toggle default
  const handleToggleDefault = async (prompt: ImageAnalysisPrompt) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const headers = await getAuthHeaders();
      if (Object.keys(headers).length === 0) {
        throw new Error("No authentication token available");
      }

      const response = await fetch(
        `/api/admin/image-analysis-prompts/${prompt._id}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            ...prompt,
            isDefault: !prompt.isDefault,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update prompt");
      }

      toast.success("Prompt updated successfully");
      await fetchPrompts();
    } catch (error) {
      console.error("Error updating prompt:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update prompt"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (prompt: ImageAnalysisPrompt) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const headers = await getAuthHeaders();
      if (Object.keys(headers).length === 0) {
        throw new Error("No authentication token available");
      }

      const response = await fetch(
        `/api/admin/image-analysis-prompts/${prompt._id}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            ...prompt,
            isActive: !prompt.isActive,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update prompt");
      }

      toast.success("Prompt updated successfully");
      await fetchPrompts();
    } catch (error) {
      console.error("Error updating prompt:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update prompt"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modal handlers
  const handleOpenCreateModal = () => {
    setEditingPrompt(null);
    setFormData({
      name: "",
      description: "",
      prompt: "",
      isDefault: false,
      isActive: true,
      category: "general",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prompt: ImageAnalysisPrompt) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      description: prompt.description,
      prompt: prompt.prompt,
      isDefault: prompt.isDefault,
      isActive: prompt.isActive,
      category: prompt.category,
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
      isDefault: false,
      isActive: true,
      category: "general",
    });
  };

  const handleOpenDeleteConfirm = (prompt: ImageAnalysisPrompt) => {
    setDeleteConfirmPrompt(prompt);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading prompts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Image Analysis Prompts</h2>
          <p className="text-muted-foreground">
            Manage OpenAI prompts for image analysis
          </p>
        </div>
        <Button onClick={handleOpenCreateModal} disabled={isSubmitting}>
          <Plus className="mr-2 h-4 w-4" />
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
                    {prompt.isDefault && (
                      <Badge variant="default">Default</Badge>
                    )}
                    {!prompt.isActive && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{prompt.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEditModal(prompt)}
                    disabled={isSubmitting}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDeleteConfirm(prompt)}
                    disabled={isSubmitting || prompt.isDefault}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Prompt</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                    {prompt.prompt.length > 200
                      ? `${prompt.prompt.substring(0, 200)}...`
                      : prompt.prompt}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={prompt.isDefault}
                      onCheckedChange={() => handleToggleDefault(prompt)}
                      disabled={isSubmitting}
                    />
                    <Label className="text-sm">Default</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={prompt.isActive}
                      onCheckedChange={() => handleToggleActive(prompt)}
                      disabled={isSubmitting}
                    />
                    <Label className="text-sm">Active</Label>
                  </div>
                  <Badge variant="outline">{prompt.category}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPrompt ? "Edit Prompt" : "Create New Prompt"}
            </DialogTitle>
            <DialogDescription>
              {editingPrompt
                ? "Update the image analysis prompt"
                : "Create a new prompt for OpenAI image analysis"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Detailed Analysis"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="general">General</option>
                  <option value="detailed">Detailed</option>
                  <option value="quick">Quick</option>
                  <option value="technical">Technical</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of this prompt's purpose"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                value={formData.prompt}
                onChange={(e) =>
                  setFormData({ ...formData, prompt: e.target.value })
                }
                placeholder="Enter the OpenAI prompt for image analysis..."
                rows={8}
                required
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isDefault}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isDefault: checked })
                  }
                />
                <Label className="text-sm">Set as default</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label className="text-sm">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                disabled={isSubmitting}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting
                  ? "Saving..."
                  : editingPrompt
                    ? "Update Prompt"
                    : "Create Prompt"}
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
              disabled={isSubmitting}
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
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImageAnalysisPromptsContent;
