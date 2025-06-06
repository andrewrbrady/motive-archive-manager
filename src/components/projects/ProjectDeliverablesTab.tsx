"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Target, MoreHorizontal, FileJson } from "lucide-react";
import { format } from "date-fns";
import { Project } from "@/types/project";
import { toast } from "@/components/ui/use-toast";
import JsonUploadPasteModal from "@/components/common/JsonUploadPasteModal";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

interface MemberDetails {
  name: string;
  email: string;
  image?: string;
}

interface ProjectDeliverablesTabProps {
  project: Project;
  memberDetails: Record<string, MemberDetails>;
  onProjectUpdate: () => void;
}

export function ProjectDeliverablesTab({
  project,
  memberDetails,
  onProjectUpdate,
}: ProjectDeliverablesTabProps) {
  const { user } = useFirebaseAuth();
  const [isAddDeliverableOpen, setIsAddDeliverableOpen] = useState(false);
  const [isLinkDeliverableOpen, setIsLinkDeliverableOpen] = useState(false);
  const [showJsonUpload, setShowJsonUpload] = useState(false);
  const [isSubmittingJson, setIsSubmittingJson] = useState(false);
  const [deliverableForm, setDeliverableForm] = useState({
    title: "",
    description: "",
    type: "Video" as
      | "Video"
      | "Photo Gallery"
      | "Mixed Gallery"
      | "Video Gallery",
    platform: "Other" as string,
    duration: 30,
    aspectRatio: "16:9",
    dueDate: new Date(),
    assignedTo: "unassigned",
    carId: "",
  });
  const [isAddingDeliverable, setIsAddingDeliverable] = useState(false);
  const [projectDeliverables, setProjectDeliverables] = useState<any[]>([]);
  const [isLoadingDeliverables, setIsLoadingDeliverables] = useState(true);
  const [existingDeliverables, setExistingDeliverables] = useState<any[]>([]);
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>(
    []
  );
  const [isLinkingDeliverables, setIsLinkingDeliverables] = useState(false);

  // Fetch project deliverables on mount and when project changes
  useEffect(() => {
    if (project) {
      fetchProjectDeliverables();
    }
  }, [project]);

  const fetchProjectDeliverables = async () => {
    if (!user) {
      console.log("No user available for fetching project deliverables");
      return;
    }

    try {
      console.log("📦 Fetching project deliverables...");

      // Get the Firebase ID token
      const token = await user.getIdToken();

      const response = await fetch(
        `/api/projects/${project._id}/deliverables`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch deliverables");
      }

      const data = await response.json();
      console.log(
        "✅ Project deliverables fetched:",
        data.deliverables?.length || 0
      );
      setProjectDeliverables(data.deliverables || []);
    } catch (error) {
      console.error("💥 Error fetching project deliverables:", error);
    }
  };

  const fetchExistingDeliverables = async () => {
    if (!user) {
      console.log("No user available for fetching existing deliverables");
      return;
    }

    try {
      setIsLoadingDeliverables(true);
      console.log("📦 Fetching all existing deliverables...");

      // Get the Firebase ID token
      const token = await user.getIdToken();

      const response = await fetch("/api/deliverables", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch existing deliverables");
      }

      const data = await response.json();
      console.log(
        "✅ Existing deliverables fetched:",
        data.deliverables?.length || 0
      );

      // Filter out deliverables that are already linked to this project
      const currentDeliverableIds = project?.deliverableIds || [];
      const availableDeliverables = (data.deliverables || []).filter(
        (deliverable: any) => !currentDeliverableIds.includes(deliverable._id)
      );

      setExistingDeliverables(availableDeliverables);
    } catch (error) {
      console.error("💥 Error fetching existing deliverables:", error);
      toast({
        title: "Error",
        description: "Failed to load existing deliverables",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDeliverables(false);
    }
  };

  const handleAddDeliverable = async () => {
    console.log("🚀 Frontend: Starting deliverable creation");
    console.log("📋 Project state:", {
      hasProject: !!project,
      projectId: project?._id,
      projectTitle: project?.title,
    });
    console.log("📝 Form data:", deliverableForm);

    if (!deliverableForm.title.trim()) {
      toast({
        title: "Error",
        description: "Please provide a deliverable title",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create deliverables",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAddingDeliverable(true);
      console.log("⏳ Setting loading state...");

      // Get the Firebase ID token
      const token = await user.getIdToken();

      const requestBody = {
        title: deliverableForm.title,
        description: deliverableForm.description,
        type: deliverableForm.type,
        platform: deliverableForm.platform,
        duration: deliverableForm.duration,
        aspectRatio: deliverableForm.aspectRatio,
        dueDate: deliverableForm.dueDate.toISOString(),
        assignedTo:
          deliverableForm.assignedTo === "unassigned"
            ? undefined
            : deliverableForm.assignedTo,
        carId: deliverableForm.carId || undefined,
      };

      console.log(
        "📤 Request body to send:",
        JSON.stringify(requestBody, null, 2)
      );
      console.log(
        "🌐 Making API request to:",
        `/api/projects/${project._id}/deliverables`
      );

      const response = await fetch(
        `/api/projects/${project._id}/deliverables`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      console.log("📥 API response received:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.log("❌ API error response:", errorData);
        throw new Error(errorData.error || "Failed to add deliverable");
      }

      const successData = await response.json();
      console.log("✅ API success response:", successData);

      // Refresh project data and deliverables
      console.log("🔄 Refreshing project data and deliverables...");
      await onProjectUpdate();
      await fetchProjectDeliverables();
      console.log("✅ Project data and deliverables refreshed");

      // Reset form and close modal
      setDeliverableForm({
        title: "",
        description: "",
        type: "Video",
        platform: "Other",
        duration: 30,
        aspectRatio: "16:9",
        dueDate: new Date(),
        assignedTo: "unassigned",
        carId: "",
      });
      setIsAddDeliverableOpen(false);

      console.log("🎉 Showing success toast...");
      toast({
        title: "Success",
        description: "Deliverable added successfully",
      });
      console.log("🎉 Frontend: Deliverable creation completed successfully");
    } catch (error) {
      console.error("💥 Frontend error:", error);
      console.error("📊 Error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "No stack trace",
      });

      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add deliverable",
        variant: "destructive",
      });
    } finally {
      setIsAddingDeliverable(false);
    }
  };

  const handleLinkExistingDeliverables = async () => {
    if (selectedDeliverables.length === 0) return;

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to link deliverables",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLinkingDeliverables(true);
      console.log("🔗 Linking deliverables to project:", selectedDeliverables);

      // Get the Firebase ID token
      const token = await user.getIdToken();

      // Link each selected deliverable to the project
      for (const deliverableId of selectedDeliverables) {
        const response = await fetch(
          `/api/projects/${project._id}/deliverables`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              linkExisting: true,
              deliverableId: deliverableId,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `Failed to link deliverable ${deliverableId}`
          );
        }
      }

      // Refresh project data and deliverables
      await onProjectUpdate();
      await fetchProjectDeliverables();

      // Reset selection and close modal
      setSelectedDeliverables([]);
      setIsLinkDeliverableOpen(false);

      toast({
        title: "Success",
        description: `${selectedDeliverables.length} deliverable(s) linked to project successfully`,
      });
    } catch (error) {
      console.error("💥 Error linking deliverables:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to link deliverables",
        variant: "destructive",
      });
    } finally {
      setIsLinkingDeliverables(false);
    }
  };

  const handleUpdateDeliverableStatus = async (
    deliverableId: string,
    status: string
  ) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to update deliverable status",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the Firebase ID token
      const token = await user.getIdToken();

      const response = await fetch(
        `/api/projects/${project._id}/deliverables`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ deliverableId, status }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update deliverable");
      }

      // Refresh project data and deliverables
      await onProjectUpdate();
      await fetchProjectDeliverables();

      toast({
        title: "Success",
        description: "Deliverable status updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update deliverable",
        variant: "destructive",
      });
    }
  };

  const handleRemoveDeliverable = async (deliverableId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to remove deliverables",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("🗑️ Removing deliverable from project:", deliverableId);

      // Get the Firebase ID token
      const token = await user.getIdToken();

      const response = await fetch(
        `/api/projects/${project._id}/deliverables/${deliverableId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove deliverable");
      }

      console.log("✅ Deliverable removed successfully");

      // Update local state
      setProjectDeliverables((prev) =>
        prev.filter((d) => d._id !== deliverableId)
      );

      // Trigger project update
      onProjectUpdate();

      toast({
        title: "Success",
        description: "Deliverable removed from project",
      });
    } catch (error) {
      console.error("💥 Error removing deliverable:", error);
      toast({
        title: "Error",
        description: "Failed to remove deliverable",
        variant: "destructive",
      });
    }
  };

  const handleJsonSubmit = async (jsonData: any[]) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create deliverables",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmittingJson(true);

      // Get the Firebase ID token
      const token = await user.getIdToken();

      const response = await fetch(
        `/api/projects/${project._id}/deliverables/batch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ deliverables: jsonData }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create deliverables");
      }

      const result = await response.json();

      toast({
        title: "Success",
        description: `Created ${result.created} deliverable${
          result.created !== 1 ? "s" : ""
        } successfully`,
      });

      // Refresh the deliverables list
      await fetchProjectDeliverables();
      onProjectUpdate();
    } catch (error) {
      console.error("Error creating deliverables:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create deliverables",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingJson(false);
    }
  };

  const toggleDeliverableSelection = (deliverableId: string) => {
    setSelectedDeliverables((prev) =>
      prev.includes(deliverableId)
        ? prev.filter((id) => id !== deliverableId)
        : [...prev, deliverableId]
    );
  };

  const getDeliverableTypeIcon = (type: string) => {
    switch (type) {
      case "document":
        return "📄";
      case "video":
        return "🎥";
      case "image":
        return "🖼️";
      case "presentation":
        return "📊";
      default:
        return "📎";
    }
  };

  const getDeliverableStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "review":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Deliverables</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowJsonUpload(true)}
            >
              <FileJson className="h-4 w-4 mr-2" />
              JSON Upload
            </Button>
            <Dialog
              open={isLinkDeliverableOpen}
              onOpenChange={(open) => {
                setIsLinkDeliverableOpen(open);
                if (open) {
                  fetchExistingDeliverables();
                } else {
                  setSelectedDeliverables([]);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Link Existing
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Link Existing Deliverables</DialogTitle>
                  <DialogDescription>
                    Select existing deliverables to link to this project.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto py-4">
                  {isLoadingDeliverables ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-sm text-muted-foreground">
                        Loading deliverables...
                      </div>
                    </div>
                  ) : existingDeliverables.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">
                        No available deliverables
                      </p>
                      <p className="text-sm">
                        All existing deliverables are already linked to this
                        project
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {existingDeliverables.map((deliverable: any) => (
                        <div
                          key={deliverable._id}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedDeliverables.includes(deliverable._id)
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/20"
                          }`}
                          onClick={() =>
                            toggleDeliverableSelection(deliverable._id)
                          }
                        >
                          <input
                            type="checkbox"
                            checked={selectedDeliverables.includes(
                              deliverable._id
                            )}
                            onChange={() =>
                              toggleDeliverableSelection(deliverable._id)
                            }
                            className="rounded"
                          />
                          <div className="text-2xl">
                            {getDeliverableTypeIcon(deliverable.type)}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">
                              {deliverable.title}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {deliverable.platform} • {deliverable.type}
                              {deliverable.description && (
                                <span> • {deliverable.description}</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Due:{" "}
                              {format(
                                new Date(deliverable.edit_deadline),
                                "MMM d, yyyy"
                              )}
                              {deliverable.firebase_uid && (
                                <span>
                                  {" "}
                                  • Assigned to user {deliverable.firebase_uid}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge
                            className={getDeliverableStatusColor(
                              deliverable.status
                            )}
                          >
                            {deliverable.status.replace("_", " ")}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedDeliverables([]);
                      setIsLinkDeliverableOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleLinkExistingDeliverables}
                    disabled={
                      isLinkingDeliverables || selectedDeliverables.length === 0
                    }
                  >
                    {isLinkingDeliverables
                      ? "Linking..."
                      : `Link ${selectedDeliverables.length} Deliverable${
                          selectedDeliverables.length !== 1 ? "s" : ""
                        }`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog
              open={isAddDeliverableOpen}
              onOpenChange={setIsAddDeliverableOpen}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Deliverable
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Deliverable</DialogTitle>
                  <DialogDescription>
                    Create a new deliverable for this project.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="deliverableTitle">Title</Label>
                    <Input
                      id="deliverableTitle"
                      value={deliverableForm.title}
                      onChange={(e) =>
                        setDeliverableForm({
                          ...deliverableForm,
                          title: e.target.value,
                        })
                      }
                      placeholder="Enter deliverable title"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="deliverableDescription">Description</Label>
                    <Textarea
                      id="deliverableDescription"
                      value={deliverableForm.description}
                      onChange={(e) =>
                        setDeliverableForm({
                          ...deliverableForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Enter deliverable description (optional)"
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Type</Label>
                    <CustomDropdown
                      value={deliverableForm.type}
                      onChange={(value) =>
                        setDeliverableForm({
                          ...deliverableForm,
                          type: value as any,
                        })
                      }
                      options={[
                        { value: "Video", label: "Video" },
                        { value: "Photo Gallery", label: "Photo Gallery" },
                        { value: "Mixed Gallery", label: "Mixed Gallery" },
                        { value: "Video Gallery", label: "Video Gallery" },
                      ]}
                      placeholder="Select type"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Platform</Label>
                    <CustomDropdown
                      value={deliverableForm.platform}
                      onChange={(value) =>
                        setDeliverableForm({
                          ...deliverableForm,
                          platform: value,
                        })
                      }
                      options={[
                        { value: "Instagram Reels", label: "Instagram Reels" },
                        { value: "Instagram Post", label: "Instagram Post" },
                        { value: "Instagram Story", label: "Instagram Story" },
                        { value: "YouTube", label: "YouTube" },
                        { value: "YouTube Shorts", label: "YouTube Shorts" },
                        { value: "TikTok", label: "TikTok" },
                        { value: "Facebook", label: "Facebook" },
                        { value: "Bring a Trailer", label: "Bring a Trailer" },
                        { value: "Other", label: "Other" },
                      ]}
                      placeholder="Select platform"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="duration">Duration (seconds)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      value={deliverableForm.duration}
                      onChange={(e) =>
                        setDeliverableForm({
                          ...deliverableForm,
                          duration: parseInt(e.target.value) || 30,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Aspect Ratio</Label>
                    <CustomDropdown
                      value={deliverableForm.aspectRatio}
                      onChange={(value) =>
                        setDeliverableForm({
                          ...deliverableForm,
                          aspectRatio: value,
                        })
                      }
                      options={[
                        { value: "16:9", label: "16:9" },
                        { value: "9:16", label: "9:16" },
                        { value: "1:1", label: "1:1" },
                        { value: "4:3", label: "4:3" },
                        { value: "3:4", label: "3:4" },
                      ]}
                      placeholder="Select aspect ratio"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={format(deliverableForm.dueDate, "yyyy-MM-dd")}
                      onChange={(e) =>
                        setDeliverableForm({
                          ...deliverableForm,
                          dueDate: new Date(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Assigned To (Optional)</Label>
                    <CustomDropdown
                      value={deliverableForm.assignedTo}
                      onChange={(value) =>
                        setDeliverableForm({
                          ...deliverableForm,
                          assignedTo: value,
                        })
                      }
                      options={[
                        { value: "unassigned", label: "Unassigned" },
                        ...(project?.members.map((member) => ({
                          value: member.userId,
                          label:
                            memberDetails[member.userId]?.name ||
                            `User ${member.userId}`,
                        })) || []),
                      ]}
                      placeholder="Select team member"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Car (Optional)</Label>
                    <CustomDropdown
                      value={deliverableForm.carId}
                      onChange={(value) =>
                        setDeliverableForm({
                          ...deliverableForm,
                          carId: value,
                        })
                      }
                      options={[
                        { value: "auto", label: "Auto-select from project" },
                        ...(project?.carIds.map((carId) => ({
                          value: carId,
                          label: `Car ${carId}`,
                        })) || []),
                      ]}
                      placeholder="Select car"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeliverableForm({
                        title: "",
                        description: "",
                        type: "Video",
                        platform: "Other",
                        duration: 30,
                        aspectRatio: "16:9",
                        dueDate: new Date(),
                        assignedTo: "unassigned",
                        carId: "",
                      });
                      setIsAddDeliverableOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddDeliverable}
                    disabled={
                      isAddingDeliverable || !deliverableForm.title.trim()
                    }
                  >
                    {isAddingDeliverable ? "Adding..." : "Add Deliverable"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {projectDeliverables.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No deliverables yet</p>
            <p className="text-sm">
              Add deliverables to track project outputs and milestones
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {projectDeliverables.map((deliverable: any) => (
              <div
                key={deliverable._id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {getDeliverableTypeIcon(deliverable.type)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{deliverable.title}</div>
                    {deliverable.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {deliverable.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>
                        Due{" "}
                        {format(
                          new Date(deliverable.edit_deadline),
                          "MMM d, yyyy"
                        )}
                      </span>
                      {deliverable.firebase_uid &&
                        memberDetails[deliverable.firebase_uid] && (
                          <span>
                            Assigned to{" "}
                            {memberDetails[deliverable.firebase_uid].name}
                          </span>
                        )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={getDeliverableStatusColor(deliverable.status)}
                  >
                    {deliverable.status.replace("_", " ")}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          handleUpdateDeliverableStatus(
                            deliverable._id,
                            "pending"
                          )
                        }
                        disabled={deliverable.status === "not_started"}
                      >
                        Mark as Pending
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleUpdateDeliverableStatus(
                            deliverable._id,
                            "in_progress"
                          )
                        }
                        disabled={deliverable.status === "in_progress"}
                      >
                        Mark as In Progress
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleUpdateDeliverableStatus(
                            deliverable._id,
                            "review"
                          )
                        }
                        disabled={deliverable.status === "in_progress"}
                      >
                        Mark as In Review
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleUpdateDeliverableStatus(
                            deliverable._id,
                            "completed"
                          )
                        }
                        disabled={deliverable.status === "done"}
                      >
                        Mark as Completed
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleRemoveDeliverable(deliverable._id)}
                        className="text-red-600"
                      >
                        Remove Deliverable
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* JSON Upload Modal */}
      <JsonUploadPasteModal
        isOpen={showJsonUpload}
        onClose={() => setShowJsonUpload(false)}
        onSubmit={handleJsonSubmit}
        title="Batch Create Deliverables from JSON"
        description="Upload a JSON file or paste JSON data to create multiple deliverables at once. The JSON should be an array of deliverable objects."
        expectedType="deliverables"
        isSubmitting={isSubmittingJson}
      />
    </Card>
  );
}
