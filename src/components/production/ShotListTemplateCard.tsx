"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "react-hot-toast";

interface ShotListTemplate {
  _id: string;
  name: string;
  description: string;
  shots: Array<{
    title: string;
    description: string;
    angle?: string;
    lighting?: string;
    notes?: string;
  }>;
}

interface ShotListTemplateCardProps {
  template: ShotListTemplate;
  onTemplateDeleted?: () => void;
}

export default function ShotListTemplateCard({
  template,
  onTemplateDeleted,
}: ShotListTemplateCardProps) {
  const api = useAPI();
  const [loading, setLoading] = useState(false);

  // Authentication check - render basic card without actions if not authenticated
  if (!api) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{template.name}</CardTitle>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {template.description}
          </p>
          <div className="mt-2 text-sm text-muted-foreground">
            {template.shots.length} shots
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this template?")) {
      return;
    }

    setLoading(true);

    try {
      await api.delete(`shot-templates/${template._id}`);

      toast.success("Shot list template deleted successfully");

      // Call callback to refresh the templates list
      if (onTemplateDeleted) {
        onTemplateDeleted();
      }
    } catch (error) {
      console.error("Error deleting shot list template:", error);
      toast.error("Failed to delete shot list template");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{template.name}</CardTitle>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              // TODO: Implement edit functionality
              // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Edit template:", template._id);
            }}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2Icon className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{template.description}</p>
        <div className="mt-2 text-sm text-muted-foreground">
          {template.shots.length} shots
        </div>
      </CardContent>
    </Card>
  );
}
