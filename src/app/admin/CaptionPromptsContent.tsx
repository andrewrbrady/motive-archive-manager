"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  PlusCircle,
  Edit,
  Trash2,
  CheckCircle,
  Circle,
  Loader2,
} from "lucide-react";
import { ICaptionPrompt as ICaptionPromptFromModel } from "@/models/CaptionPrompt";
import PromptForm, { PromptFormData } from "@/components/admin/PromptForm"; // Assuming PromptForm is in this path
import { Document } from "mongoose"; // Import Document for Omit

// Client-side interface, ensuring _id is string and no Mongoose Document methods
// Export this to be used by PromptForm.tsx
export interface ICaptionPrompt
  extends Omit<
    ICaptionPromptFromModel,
    "_id" | "createdAt" | "updatedAt" | keyof Document
  > {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CaptionPromptDataFromAPI
  extends Omit<
    ICaptionPrompt,
    "_id" | "createdAt" | "updatedAt" | "isDefault"
  > {
  _id: string;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean; // API might not always return it if false, though our model defaults it
}

// Normalize data to match client-side ICaptionPrompt interface
function normalizePromptData(data: any): ICaptionPrompt {
  const normalized = {
    _id: String(data._id), // Ensure _id is string
    name: data.name,
    prompt: data.prompt,
    aiModel: data.aiModel,
    llmProvider: data.llmProvider || "anthropic", // Added with default
    platform: data.platform,
    tone: data.tone,
    style: data.style,
    length: data.length,
    isDefault: !!data.isDefault,
    includeClientHandle:
      data.includeClientHandle === undefined
        ? false
        : !!data.includeClientHandle, // Added with default
    modelParams: data.modelParams || {}, // Ensure modelParams is always an object
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
  // Remove any unexpected properties, ensuring clean object
  const cleanNormalized: ICaptionPrompt = {
    _id: normalized._id,
    name: normalized.name,
    prompt: normalized.prompt,
    aiModel: normalized.aiModel,
    llmProvider: normalized.llmProvider,
    platform: normalized.platform,
    tone: normalized.tone,
    style: normalized.style,
    length: normalized.length,
    isDefault: normalized.isDefault,
    includeClientHandle: normalized.includeClientHandle,
    modelParams: normalized.modelParams,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
  };
  return cleanNormalized;
}

const CaptionPromptsContent: React.FC = () => {
  const [prompts, setPrompts] = useState<ICaptionPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<ICaptionPrompt | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [promptToDelete, setPromptToDelete] = useState<ICaptionPrompt | null>(
    null
  );

  const fetchPrompts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/caption-prompts");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch prompts");
      }
      const dataFromApi: any[] = await response.json();
      setPrompts(dataFromApi.map((item) => normalizePromptData(item)));
    } catch (err) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      toast.error("Error fetching prompts", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const handleOpenAddModal = () => {
    setEditingPrompt(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prompt: ICaptionPrompt) => {
    setEditingPrompt(prompt);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return; // Prevent closing while submitting
    setIsModalOpen(false);
    setEditingPrompt(null);
  };

  const handleSubmitPrompt = async (formData: PromptFormData) => {
    setIsSubmitting(true);
    const method = editingPrompt ? "PATCH" : "POST";
    const url = "/api/caption-prompts";

    // Construct payload carefully. `id` is only for PATCH.
    // `aiModel` is part of PromptFormData.
    const payload: any = {
      name: formData.name,
      prompt: formData.prompt,
      aiModel: formData.aiModel, // Ensure this is correct based on PromptFormData
      platform: formData.platform,
      tone: formData.tone,
      style: formData.style,
      length: formData.length,
      isDefault: formData.isDefault === undefined ? false : formData.isDefault, // Handle optional boolean
    };

    if (editingPrompt) {
      payload.id = editingPrompt._id;
    }

    try {
      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `Failed to ${editingPrompt ? "update" : "create"} prompt`
        );
      }

      toast.success(
        `Prompt ${editingPrompt ? "updated" : "created"} successfully!`
      );
      fetchPrompts();
      handleCloseModal();
    } catch (err) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      toast.error(`Error ${editingPrompt ? "updating" : "creating"} prompt`, {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (promptId: string) => {
    const originalPrompts = prompts.map((p) => ({ ...p })); // Clone existing plain objects

    setPrompts((prevPrompts) =>
      prevPrompts.map((p) =>
        normalizePromptData({
          // Ensure the new object conforms to ICaptionPrompt
          ...p,
          isDefault: p._id === promptId,
        })
      )
    );

    try {
      const response = await fetch(`/api/caption-prompts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: promptId, isDefault: true }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to set default prompt");
      }
      toast.success("Default prompt updated successfully!");
      fetchPrompts(); // Re-fetch to get canonical state from DB
    } catch (err) {
      console.error(err);
      setPrompts(originalPrompts); // Revert to cloned plain objects
      toast.error("Error setting default prompt", {
        description:
          err instanceof Error ? err.message : "An unknown error occurred",
      });
    }
  };

  const handleOpenDeleteConfirm = (prompt: ICaptionPrompt) => {
    setPromptToDelete(prompt);
    setShowDeleteConfirm(true);
  };

  const handleCloseDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setPromptToDelete(null);
  };

  const confirmDeletePrompt = async () => {
    if (!promptToDelete) return;
    setIsSubmitting(true); // Use for delete operation as well
    try {
      const response = await fetch(`/api/caption-prompts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: promptToDelete._id }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete prompt");
      }
      toast.success("Prompt deleted successfully!");
      fetchPrompts();
      handleCloseDeleteConfirm();
    } catch (err) {
      console.error(err);
      toast.error("Error deleting prompt", {
        description:
          err instanceof Error ? err.message : "An unknown error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && prompts.length === 0) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && prompts.length === 0) {
    return (
      <div className="p-6 text-center text-red-500">
        Error: {error}{" "}
        <Button variant="outline" onClick={fetchPrompts} className="ml-2">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Caption Prompt Settings</h2>
        <Button onClick={handleOpenAddModal} disabled={isSubmitting}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Prompt
        </Button>
      </div>

      {prompts.length === 0 && !isLoading && !error && (
        <p className="text-muted-foreground text-center py-10">
          No caption prompts found. Get started by adding one!
        </p>
      )}

      <div className="space-y-4">
        {prompts.map((prompt) => (
          <div
            key={prompt._id as string}
            className="bg-card p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-grow">
                <h3 className="text-lg font-semibold">{prompt.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Platform:{" "}
                  <span className="font-medium text-foreground">
                    {prompt.platform}
                  </span>{" "}
                  | Model:{" "}
                  <span className="font-medium text-foreground">
                    {prompt.aiModel}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Tone:{" "}
                  <span className="font-medium text-foreground">
                    {prompt.tone}
                  </span>{" "}
                  | Style:{" "}
                  <span className="font-medium text-foreground">
                    {prompt.style}
                  </span>{" "}
                  | Length:{" "}
                  <span className="font-medium text-foreground">
                    {prompt.length}
                  </span>
                </p>
                <details className="mt-2 text-xs cursor-pointer">
                  <summary className="hover:underline text-muted-foreground">
                    View Prompt Text
                  </summary>
                  <pre className="mt-1 p-3 bg-muted rounded text-xs whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                    {prompt.prompt}
                  </pre>
                </details>
              </div>
              <div className="flex flex-col items-end space-y-2 flex-shrink-0 w-[150px]">
                <Button
                  variant={prompt.isDefault ? "secondary" : "outline"}
                  size="sm"
                  onClick={() =>
                    !prompt.isDefault && handleSetDefault(prompt._id as string)
                  }
                  disabled={prompt.isDefault || isSubmitting}
                  className="w-full flex items-center justify-center"
                >
                  {isSubmitting && prompt.isDefault ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : prompt.isDefault ? (
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="mr-2 h-4 w-4" />
                  )}
                  {prompt.isDefault ? "Default" : "Set Default"}
                </Button>
                <div className="flex space-x-2 w-full">
                  <Button
                    className="flex-grow"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEditModal(prompt)}
                    disabled={isSubmitting}
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button
                    className="flex-grow"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleOpenDeleteConfirm(prompt)}
                    disabled={isSubmitting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-right">
              Last updated: {new Date(prompt.updatedAt).toLocaleDateString()} |
              Created: {new Date(prompt.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      <Dialog
        open={isModalOpen}
        onOpenChange={(isOpen) => !isOpen && handleCloseModal()}
      >
        <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPrompt ? "Edit Prompt" : "Add New Prompt"}
            </DialogTitle>
            {editingPrompt && (
              <DialogDescription>
                Editing prompt: {editingPrompt.name}
              </DialogDescription>
            )}
          </DialogHeader>
          <PromptForm
            key={(editingPrompt?._id as string) || "new"} // Ensures form resets when editingPrompt changes
            prompt={editingPrompt || undefined}
            onSubmit={handleSubmitPrompt}
            onCancel={handleCloseModal}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showDeleteConfirm}
        onOpenChange={(isOpen) => !isOpen && handleCloseDeleteConfirm()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete this prompt?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The prompt "
              <strong>{promptToDelete?.name}</strong>" will be permanently
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleCloseDeleteConfirm}
              disabled={isSubmitting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePrompt}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CaptionPromptsContent;
