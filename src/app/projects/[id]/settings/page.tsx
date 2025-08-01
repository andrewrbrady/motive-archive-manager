"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "@/hooks/useFirebaseAuth";
import { useAPI } from "@/hooks/useAPI";
import { useRouter } from "next/navigation";
import { Project } from "@/types/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTitle } from "@/components/ui/PageTitle";
import { ArrowLeft, Save, Upload } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { PrimaryImageSelector } from "@/components/projects/PrimaryImageSelector";

interface ProjectSettingsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ProjectSettingsPage({
  params,
}: ProjectSettingsPageProps) {
  const { data: session, status } = useSession();
  const api = useAPI();
  const router = useRouter();
  const resolvedParams = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    primaryImageId: "",
  });

  useEffect(() => {
    // Only fetch when authenticated
    if (status === "authenticated" && session?.user) {
      fetchProject();
    }
  }, [status, session, resolvedParams.id]);

  const fetchProject = async () => {
    if (!api) return;

    try {
      setLoading(true);

      const data = (await api.get(`projects/${resolvedParams.id}`)) as {
        project: Project;
      };
      setProject(data.project);

      // Initialize form data
      setFormData({
        title: data.project.title || "",
        description: data.project.description || "",
        primaryImageId: data.project.primaryImageId || "",
      });
    } catch (err: any) {
      if (err.status === 404) {
        setError("Project not found");
      } else if (err.status === 401) {
        setError("You don't have permission to access this project");
      } else {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!project || !api) return;

    try {
      setSaving(true);

      const updatedProject = (await api.put(`/api/projects/${project._id}`, {
        title: formData.title,
        description: formData.description,
        primaryImageId: formData.primaryImageId || undefined,
      })) as { project: Project };

      setProject(updatedProject.project);

      toast({
        title: "Success",
        description: "Project settings updated successfully",
      });

      // Redirect back to project page
      router.push(`/projects/${project._id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.status === 401
            ? "You don't have permission to update this project"
            : error instanceof Error
              ? error.message
              : "Failed to update project settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    router.push(`/projects/${resolvedParams.id}`);
  };

  const handlePrimaryImageSelect = (imageId: string | null) => {
    setFormData({ ...formData, primaryImageId: imageId || "" });
  };

  // Show loading while authentication is being handled
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container-wide px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading project settings...</div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container-wide px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-lg text-red-600 mb-4">
                {error || "Project not found"}
              </div>
              <Button onClick={() => router.push("/projects")}>
                Back to Projects
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container-wide px-6 py-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Header */}
          <PageTitle title="Project Settings">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Project
            </Button>
          </PageTitle>

          {/* Settings Form */}
          <div className="max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-6">
                {/* Project Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Project Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Enter project title"
                  />
                </div>

                {/* Project Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Enter project description"
                    rows={4}
                  />
                </div>

                {/* Primary Image Selector */}
                <div className="space-y-2">
                  <Label>Primary Image</Label>
                  <PrimaryImageSelector
                    selectedImageId={formData.primaryImageId || undefined}
                    onImageSelect={handlePrimaryImageSelect}
                  />
                  <p className="text-sm text-muted-foreground">
                    Select an image to use as the primary image for this
                    project. This will be displayed as the project thumbnail.
                  </p>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
