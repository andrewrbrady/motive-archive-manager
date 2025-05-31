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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Platform, AspectRatio } from "@/types/scriptTemplate";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "react-hot-toast";

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

interface CreateScriptTemplateResponse {
  id: string;
  name: string;
  description: string;
  platforms: Platform[];
  aspectRatio: AspectRatio;
  rows: any[];
  createdAt: string;
  updatedAt: string;
}

interface CreateScriptTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateScriptTemplateDialog({
  open,
  onOpenChange,
}: CreateScriptTemplateDialogProps) {
  const api = useAPI();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [loading, setLoading] = useState(false);

  // Authentication check
  if (!api) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Script Template</DialogTitle>
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
      const response = await api.post<CreateScriptTemplateResponse>(
        "script-templates",
        {
          name,
          description,
          platforms,
          aspectRatio,
          rows: [],
        }
      );

      toast.success("Script template created successfully");
      onOpenChange(false);
      setName("");
      setDescription("");
      setPlatforms([]);
      setAspectRatio("16:9");
    } catch (error) {
      console.error("Error creating script template:", error);
      toast.error("Failed to create script template");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Script Template</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., 30 Second Commercial"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this template"
              required
            />
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
                      id={platform.value}
                      checked={platforms.includes(platform.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setPlatforms([...platforms, platform.value]);
                        } else {
                          setPlatforms(
                            platforms.filter((p) => p !== platform.value)
                          );
                        }
                      }}
                    />
                    <Label htmlFor={platform.value}>{platform.label}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Aspect Ratio</Label>
              <Select
                value={aspectRatio}
                onValueChange={(value) => setAspectRatio(value as AspectRatio)}
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
