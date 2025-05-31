"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "react-hot-toast";

interface CreateShotListTemplateResponse {
  _id: string;
  name: string;
  description: string;
  shots: any[];
  createdAt: string;
  updatedAt: string;
}

interface CreateShotListTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateShotListTemplateDialog({
  open,
  onOpenChange,
}: CreateShotListTemplateDialogProps) {
  const api = useAPI();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // Authentication check
  if (!api) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Shot List Template</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post<CreateShotListTemplateResponse>(
        "shot-list-templates",
        {
          name,
          description,
          shots: [],
        }
      );

      toast.success("Shot list template created successfully");
      onOpenChange(false);
      setName("");
      setDescription("");
    } catch (error) {
      console.error("Error creating shot list template:", error);
      toast.error("Failed to create shot list template");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Shot List Template</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter template name"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter template description"
              required
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
