"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
import { PromptEditModal } from "@/components/projects/caption-generator/PromptEditModal";
import { llmProviders, ProviderId } from "@/lib/llmProviders";
import { Document } from "mongoose";
import { useAuthenticatedFetch } from "@/hooks/useFirebaseAuth";

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
  isDefault?: boolean;
}

// Convert ICaptionPrompt to PromptTemplate format for the modal
interface PromptTemplate {
  _id: string;
  name: string;
  prompt: string;
  aiModel: string;
  llmProvider: string;
  platform: string;
  tone: string;
  style: string;
  length: string;
  modelParams?: {
    temperature?: number;
  };
}

// Normalize data to match client-side ICaptionPrompt interface
function normalizePromptData(data: any): ICaptionPrompt {
  const normalized = {
    _id: String(data._id),
    name: data.name,
    prompt: data.prompt,
    aiModel: data.aiModel,
    llmProvider: data.llmProvider || "anthropic",
    platform: data.platform,
    tone: data.tone,
    style: data.style,
    length: data.length,
    isDefault: !!data.isDefault,
    includeClientHandle:
      data.includeClientHandle === undefined
        ? false
        : !!data.includeClientHandle,
    modelParams: data.modelParams || {},
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };

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
    modelParams: {
      temperature: normalized.modelParams?.temperature,
    },
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
  };
  return cleanNormalized;
}

// Convert ICaptionPrompt to PromptTemplate for the modal
function convertToPromptTemplate(prompt: ICaptionPrompt): PromptTemplate {
  const converted = {
    _id: prompt._id,
    name: prompt.name,
    prompt: prompt.prompt,
    aiModel: prompt.aiModel,
    llmProvider: prompt.llmProvider,
    platform: prompt.platform,
    tone: prompt.tone,
    style: prompt.style,
    length: prompt.length,
    modelParams: {
      temperature: prompt.modelParams?.temperature,
    },
  };
  return converted;
}

const CaptionPromptsContent: React.FC = () => {
  const [prompts, setPrompts] = useState<ICaptionPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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

  // Modal state for AI configuration
  const [modalModel, setModalModel] = useState("claude-3-5-sonnet-20241022");
  const [modalProvider, setModalProvider] = useState<ProviderId>("anthropic");
  const [modalTemperature, setModalTemperature] = useState(1.0);

  const { authenticatedFetch, isAuthenticated, hasValidToken } =
    useAuthenticatedFetch();

  const fetchPrompts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authenticatedFetch("/api/caption-prompts");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch prompts");
      }
      const dataFromApi: any[] = await response.json();
      const normalizedPrompts = dataFromApi.map((item) =>
        normalizePromptData(item)
      );
      setPrompts(normalizedPrompts);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      toast.error("Error fetching prompts", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    // Only fetch when authentication is ready
    if (isAuthenticated && hasValidToken) {
      fetchPrompts();
    }
  }, [isAuthenticated, hasValidToken, fetchPrompts]);

  const handleOpenAddModal = () => {
    setEditingPrompt(null);
    // Reset modal state for new prompt
    setModalModel("claude-3-5-sonnet-20241022");
    setModalProvider("anthropic");
    setModalTemperature(1.0);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prompt: ICaptionPrompt) => {
    setEditingPrompt(prompt);
    // Set modal state from existing prompt
    setModalModel(prompt.aiModel);
    setModalProvider((prompt.llmProvider as ProviderId) || "anthropic");
    setModalTemperature(prompt.modelParams?.temperature || 1.0);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingPrompt(null);
  };

  const handlePromptSaved = (savedPrompt: PromptTemplate) => {
    // Convert back to ICaptionPrompt and update the list
    const updatedPrompt: ICaptionPrompt = {
      ...savedPrompt,
      isDefault: editingPrompt?.isDefault || false,
      includeClientHandle: editingPrompt?.includeClientHandle || false,
      createdAt: editingPrompt?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    if (editingPrompt) {
      // Update existing prompt in the list
      setPrompts((prev) =>
        prev.map((p) => (p._id === savedPrompt._id ? updatedPrompt : p))
      );
    } else {
      // Add new prompt
      setPrompts((prev) => [...prev, updatedPrompt]);
    }

    // Close the modal immediately to prevent flash
    setIsModalOpen(false);
    setEditingPrompt(null);

    // Show success message
    toast.success(
      editingPrompt
        ? "Prompt updated successfully!"
        : "Prompt created successfully!"
    );

    // Refresh the list to get the latest data from server
    // Use a microtask to ensure this happens after the modal closes
    Promise.resolve().then(() => {
      fetchPrompts();
    });
  };

  const handleSetDefault = async (promptId: string) => {
    const originalPrompts = prompts.map((p) => ({ ...p }));

    setPrompts((prevPrompts) =>
      prevPrompts.map((p) =>
        normalizePromptData({
          ...p,
          isDefault: p._id === promptId,
        })
      )
    );

    try {
      const response = await authenticatedFetch(`/api/caption-prompts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: promptId, isDefault: true }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to set default prompt");
      }
      toast.success("Default prompt updated successfully!");
      fetchPrompts();
    } catch (err) {
      setPrompts(originalPrompts);
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
    setIsSubmitting(true);
    try {
      const response = await authenticatedFetch(`/api/caption-prompts`, {
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
      toast.error("Error deleting prompt", {
        description:
          err instanceof Error ? err.message : "An unknown error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (
    (isLoading || !isAuthenticated || !hasValidToken) &&
    prompts.length === 0
  ) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[300px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {!isAuthenticated || !hasValidToken
              ? "Authenticating..."
              : "Loading prompts..."}
          </p>
        </div>
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
                  </span>{" "}
                  | Provider:{" "}
                  <span className="font-medium text-foreground">
                    {llmProviders[prompt.llmProvider as ProviderId]?.name ||
                      prompt.llmProvider}
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
                  {prompt.modelParams?.temperature && (
                    <>
                      {" "}
                      | Temperature:{" "}
                      <span className="font-medium text-foreground">
                        {prompt.modelParams.temperature}
                      </span>
                    </>
                  )}
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

      {/* New PromptEditModal */}
      <PromptEditModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        isCreating={!editingPrompt}
        selectedPrompt={
          editingPrompt ? convertToPromptTemplate(editingPrompt) : null
        }
        model={modalModel}
        provider={modalProvider}
        temperature={modalTemperature}
        clientHandle={null} // No client handle in admin context
        onPromptSaved={handlePromptSaved}
        onModelChange={setModalModel}
        onProviderChange={setModalProvider}
        onTemperatureChange={setModalTemperature}
        onFormValuesUpdate={() => {}} // Not needed in admin context
      />

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
