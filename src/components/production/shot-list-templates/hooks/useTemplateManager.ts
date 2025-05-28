import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Template, ShotTemplate } from "../types";

export function useTemplateManager(shouldCreateTemplate = false) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/shot-list-templates");
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize
  useEffect(() => {
    fetchTemplates();

    if (shouldCreateTemplate) {
      setIsCreating(true);
    }
  }, [fetchTemplates, shouldCreateTemplate]);

  // Template operations
  const handleTemplateSelect = useCallback((template: Template) => {
    setSelectedTemplate(template);
    setEditingTemplate(null);
    setIsCreating(false);
  }, []);

  const handleCreateNew = useCallback(() => {
    setIsCreating(true);
    setEditingTemplate(null);
    setSelectedTemplate(null);
  }, []);

  const handleEdit = useCallback((template: Template) => {
    setEditingTemplate(template);
    setIsCreating(false);
    setSelectedTemplate(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingTemplate(null);
    setIsCreating(false);
  }, []);

  const handleSave = useCallback(
    async (data: Partial<Template>) => {
      try {
        const url = editingTemplate
          ? `/api/shot-list-templates/${editingTemplate.id}`
          : "/api/shot-list-templates";

        const method = editingTemplate ? "PUT" : "POST";

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to ${editingTemplate ? "update" : "create"} template`
          );
        }

        const result = await response.json();

        toast.success(
          `Template ${editingTemplate ? "updated" : "created"} successfully`
        );

        // Refresh templates
        await fetchTemplates();

        // Reset state
        setIsCreating(false);
        setEditingTemplate(null);

        // Select the new/updated template
        if (result.template) {
          setSelectedTemplate(result.template);
        }
      } catch (error) {
        console.error("Error saving template:", error);
        toast.error(
          `Failed to ${editingTemplate ? "update" : "create"} template`
        );
      }
    },
    [editingTemplate, fetchTemplates]
  );

  const handleDelete = useCallback(
    async (templateId: string) => {
      if (!confirm("Are you sure you want to delete this template?")) {
        return;
      }

      try {
        const response = await fetch(`/api/shot-list-templates/${templateId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete template");
        }

        toast.success("Template deleted successfully");

        // Refresh templates
        await fetchTemplates();

        // Clear selection if deleted template was selected
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate(null);
        }
      } catch (error) {
        console.error("Error deleting template:", error);
        toast.error("Failed to delete template");
      }
    },
    [fetchTemplates, selectedTemplate]
  );

  const handleDuplicate = useCallback(
    async (template: Template) => {
      try {
        const duplicatedTemplate = {
          ...template,
          name: `${template.name} (Copy)`,
          id: undefined, // Remove ID so it creates a new one
        };

        await handleSave(duplicatedTemplate);
      } catch (error) {
        console.error("Error duplicating template:", error);
        toast.error("Failed to duplicate template");
      }
    },
    [handleSave]
  );

  // Shot operations
  const handleAddShot = useCallback(() => {
    if (!editingTemplate) return;

    const newShot: ShotTemplate = {
      title: "",
      description: "",
      angle: "",
      lighting: "",
      notes: "",
    };

    setEditingTemplate({
      ...editingTemplate,
      shots: [...editingTemplate.shots, newShot],
    });
  }, [editingTemplate]);

  const handleRemoveShot = useCallback(
    (index: number) => {
      if (!editingTemplate) return;

      const updatedShots = editingTemplate.shots.filter((_, i) => i !== index);
      setEditingTemplate({
        ...editingTemplate,
        shots: updatedShots,
      });
    },
    [editingTemplate]
  );

  const handleUpdateShot = useCallback(
    (index: number, shot: ShotTemplate) => {
      if (!editingTemplate) return;

      const updatedShots = [...editingTemplate.shots];
      updatedShots[index] = shot;

      setEditingTemplate({
        ...editingTemplate,
        shots: updatedShots,
      });
    },
    [editingTemplate]
  );

  return {
    // State
    templates,
    isLoading,
    isCreating,
    editingTemplate,
    selectedTemplate,

    // Template operations
    handleTemplateSelect,
    handleCreateNew,
    handleEdit,
    handleCancelEdit,
    handleSave,
    handleDelete,
    handleDuplicate,

    // Shot operations
    handleAddShot,
    handleRemoveShot,
    handleUpdateShot,

    // Utilities
    fetchTemplates,
  };
}
