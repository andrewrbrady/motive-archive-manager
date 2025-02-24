"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScriptTemplate } from "@/models/script-template";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Badge } from "@/components/ui/badge";

interface ScriptTemplateCardProps {
  template: ScriptTemplate;
  onEdit: (template: ScriptTemplate) => void;
  onDelete: (template: ScriptTemplate) => Promise<void>;
}

export default function ScriptTemplateCard({
  template,
  onEdit,
  onDelete,
}: ScriptTemplateCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(template);
    } catch (error) {
      console.error("Failed to delete template:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">
            {template.name}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(template)}
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {template.description}
          </p>
          <div className="flex flex-wrap gap-2">
            {template.platforms.map((platform) => (
              <Badge key={platform} variant="secondary">
                {platform}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Script Template"
        description="Are you sure you want to delete this script template? This action cannot be undone."
      />
    </>
  );
}
