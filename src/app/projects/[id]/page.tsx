"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Project, ProjectStatus } from "@/types/project";
import { toast } from "@/components/ui/use-toast";
import { ProjectHeader, ProjectTabs } from "@/components/projects";

interface ProjectDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const resolvedParams = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get tab from URL searchParams, default to "overview"
  const [activeTab, setActiveTab] = useState("overview");

  // State for member details
  const [memberDetails, setMemberDetails] = useState<
    Record<
      string,
      {
        name: string;
        email: string;
        image?: string;
      }
    >
  >({});

  // Check for URL parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get("tab");

    // Migration: redirect old "captions" tab to new "copywriter" tab
    if (tabFromUrl === "captions") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "copywriter");
      window.history.replaceState({}, "", url.toString());
      setActiveTab("copywriter");
      return;
    }

    if (
      tabFromUrl &&
      [
        "overview",
        "timeline",
        "events",
        "team",
        "cars",
        "assets",
        "deliverables",
        "copywriter",
        "calendar",
      ].includes(tabFromUrl)
    ) {
      setActiveTab(tabFromUrl);
    }
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tabFromUrl = urlParams.get("tab");

      // Migration: redirect old "captions" tab to new "copywriter" tab
      if (tabFromUrl === "captions") {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", "copywriter");
        window.history.replaceState({}, "", url.toString());
        setActiveTab("copywriter");
        return;
      }

      if (
        tabFromUrl &&
        [
          "overview",
          "timeline",
          "events",
          "team",
          "cars",
          "assets",
          "deliverables",
          "copywriter",
          "calendar",
        ].includes(tabFromUrl)
      ) {
        setActiveTab(tabFromUrl);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Function to handle tab changes with URL updates
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);

    // Update URL without page reload
    const url = new URL(window.location.href);
    url.searchParams.set("tab", newTab);
    window.history.pushState({}, "", url.toString());
  };

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    fetchProject();
  }, [session, status, resolvedParams.id]);

  const fetchProject = async () => {
    console.log("🔄 Fetching project data...");
    try {
      setLoading(true);
      console.log(
        "🌐 Making request to:",
        `/api/projects/${resolvedParams.id}`
      );
      const response = await fetch(`/api/projects/${resolvedParams.id}`);

      console.log("📥 Project fetch response:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Project not found");
        }
        throw new Error("Failed to fetch project");
      }

      const data = await response.json();
      console.log("📦 Project data received:", {
        projectId: data.project?._id,
        projectTitle: data.project?.title,
        deliverablesCount: data.project?.deliverables?.length || 0,
        deliverables: data.project?.deliverables || [],
      });

      setProject(data.project);
      console.log("✅ Project state updated");

      // Fetch member details after setting project
      if (data.project.members.length > 0) {
        console.log(
          "👥 Fetching member details for",
          data.project.members.length,
          "members"
        );
        await fetchMemberDetails(
          data.project.members.map((m: any) => m.userId)
        );
      }
    } catch (err) {
      console.error("💥 Error fetching project:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      console.log("🏁 Project fetch completed");
    }
  };

  const fetchMemberDetails = async (userIds: string[]) => {
    try {
      // Use the project-specific users endpoint (no admin required)
      const response = await fetch("/api/projects/users", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const data = await response.json();

      if (!data.users || !Array.isArray(data.users)) {
        throw new Error("Invalid response format");
      }

      const details: Record<
        string,
        { name: string; email: string; image?: string }
      > = {};

      data.users.forEach((user: any) => {
        if (userIds.includes(user.uid)) {
          details[user.uid] = {
            name: user.name || user.email,
            email: user.email,
            image: user.image,
          };
        }
      });

      setMemberDetails(details);
    } catch (error) {
      console.error("Error fetching member details:", error);
    }
  };

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (!project) return;

    try {
      const response = await fetch(`/api/projects/${project._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      const { project: updatedProject } = await response.json();
      setProject(updatedProject);

      toast({
        title: "Success",
        description: "Project status updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update project status",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    router.push("/projects");
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container-wide px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading project...</div>
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
              <button
                onClick={() => router.push("/projects")}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Back to Projects
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container-wide px-6 py-8">
        <div>
          {/* Header */}
          <ProjectHeader
            project={project}
            onStatusChange={handleStatusChange}
            onBack={handleBack}
          />

          {/* Main Content Tabs */}
          <ProjectTabs
            project={project}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            memberDetails={memberDetails}
            onProjectUpdate={fetchProject}
          />
        </div>
      </main>
    </div>
  );
}
