"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Target, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { Project } from "@/types/project";
import { toast } from "@/components/ui/use-toast";

interface ProjectAssetsTabProps {
  project: Project;
  onProjectUpdate: () => void;
}

export function ProjectAssetsTab({
  project,
  onProjectUpdate,
}: ProjectAssetsTabProps) {
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [assetForm, setAssetForm] = useState({
    name: "",
    type: "gallery" as "gallery" | "image" | "deliverable",
    referenceId: "",
  });
  const [isAddingAsset, setIsAddingAsset] = useState(false);

  const handleAddAsset = async () => {
    if (!assetForm.name.trim() || !assetForm.referenceId.trim()) {
      toast({
        title: "Error",
        description: "Please provide both asset name and reference ID",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAddingAsset(true);
      const response = await fetch(`/api/projects/${project._id}/assets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: assetForm.name,
          type: assetForm.type,
          referenceId: assetForm.referenceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add asset");
      }

      // Refresh project data
      await onProjectUpdate();

      // Reset form and close modal
      setAssetForm({
        name: "",
        type: "gallery",
        referenceId: "",
      });
      setIsAddAssetOpen(false);

      toast({
        title: "Success",
        description: "Asset linked to project successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add asset",
        variant: "destructive",
      });
    } finally {
      setIsAddingAsset(false);
    }
  };

  const handleRemoveAsset = async (assetId: string) => {
    try {
      const response = await fetch(`/api/projects/${project._id}/assets`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assetId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove asset");
      }

      // Refresh project data
      await onProjectUpdate();

      toast({
        title: "Success",
        description: "Asset removed from project successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to remove asset",
        variant: "destructive",
      });
    }
  };

  const getAssetTypeIcon = (type: string) => {
    switch (type) {
      case "gallery":
        return "🖼️";
      case "image":
        return "📷";
      case "deliverable":
        return "📄";
      default:
        return "📎";
    }
  };

  const getAssetTypeColor = (type: string) => {
    switch (type) {
      case "gallery":
        return "bg-blue-100 text-blue-800";
      case "image":
        return "bg-green-100 text-green-800";
      case "deliverable":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Project Assets</CardTitle>
          <Dialog open={isAddAssetOpen} onOpenChange={setIsAddAssetOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Link Asset to Project</DialogTitle>
                <DialogDescription>
                  Link an existing gallery, image, or deliverable to this
                  project.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="assetName">Asset Name</Label>
                  <Input
                    id="assetName"
                    value={assetForm.name}
                    onChange={(e) =>
                      setAssetForm({
                        ...assetForm,
                        name: e.target.value,
                      })
                    }
                    placeholder="Enter asset name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Asset Type</Label>
                  <CustomDropdown
                    value={assetForm.type}
                    onChange={(value) =>
                      setAssetForm({
                        ...assetForm,
                        type: value as any,
                      })
                    }
                    options={[
                      { value: "gallery", label: "Gallery" },
                      { value: "image", label: "Image" },
                      { value: "deliverable", label: "Deliverable" },
                    ]}
                    placeholder="Select asset type"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="referenceId">Reference ID</Label>
                  <Input
                    id="referenceId"
                    value={assetForm.referenceId}
                    onChange={(e) =>
                      setAssetForm({
                        ...assetForm,
                        referenceId: e.target.value,
                      })
                    }
                    placeholder="Enter asset ID or reference"
                  />
                  <p className="text-xs text-muted-foreground">
                    The ID of the {assetForm.type} you want to link to this
                    project
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAssetForm({
                      name: "",
                      type: "gallery",
                      referenceId: "",
                    });
                    setIsAddAssetOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddAsset} disabled={isAddingAsset}>
                  {isAddingAsset ? "Linking..." : "Link Asset"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {project.assets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No assets linked yet</p>
            <p className="text-sm">
              Link galleries, images, or deliverables to this project
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {project.assets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{getAssetTypeIcon(asset.type)}</div>
                  <div>
                    <div className="font-medium">{asset.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Added {format(new Date(asset.addedAt), "MMM d, yyyy")} •
                      ID: {asset.referenceId}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getAssetTypeColor(asset.type)}>
                    {asset.type}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View {asset.type}</DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleRemoveAsset(asset.id)}
                        className="text-red-600"
                      >
                        Remove from Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
