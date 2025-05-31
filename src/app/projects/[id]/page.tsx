"use client";

import { useState, useEffect, use, lazy, Suspense, useRef } from "react";
import { useSession, useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useRouter, useParams } from "next/navigation";
import { Project, ProjectStatus } from "@/types/project";
import { toast } from "@/components/ui/use-toast";
import { useAPI } from "@/hooks/useAPI";

// ✅ Direct imports to avoid the 20MB barrel export bundle
const ProjectHeader = lazy(() =>
  import("@/components/projects/ProjectHeader").then((m) => ({
    default: m.ProjectHeader,
  }))
);
const ProjectTabs = lazy(() =>
  import("@/components/projects/ProjectTabs").then((m) => ({
    default: m.ProjectTabs,
  }))
);

// ✅ Simple loading fallback
const PageSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="h-32 bg-muted rounded"></div>
        <div className="h-64 bg-muted rounded"></div>
      </div>
    </div>
  </div>
);

interface ProjectDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ProjectDetailPage() {
  const { data: session, status } = useSession();
  const { user } = useFirebaseAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const api = useAPI();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitingUser, setInvitingUser] = useState(false);
  const initialLoadRef = useRef(false);

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
        "galleries",
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
          "galleries",
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

  // Initial authentication and load effect
  useEffect(() => {
    console.log("ProjectDetailPage: Auth useEffect triggered", {
      status,
      sessionExists: !!session,
      userExists: !!user,
      userId: session?.user?.id,
      initialLoadDone: initialLoadRef.current,
    });

    if (status === "loading") {
      console.log("ProjectDetailPage: Session still loading...");
      return;
    }

    if (!session) {
      console.log("ProjectDetailPage: No session, redirecting to signin");
      router.push("/auth/signin");
      return;
    }

    if (!user) {
      console.log(
        "ProjectDetailPage: Session exists but no Firebase user yet, waiting..."
      );
      return;
    }

    if (!initialLoadRef.current) {
      console.log(
        "ProjectDetailPage: Initial load - session and user valid, fetching project"
      );
      initialLoadRef.current = true;
      fetchProject();
    }
  }, [session, status, user, projectId]);

  const fetchProject = async () => {
    console.log("🔄 Fetching project data...");
    try {
      setLoading(true);

      if (!api) {
        console.log("ProjectDetailPage: No API client available");
        throw new Error("Authentication required");
      }

      console.log("🌐 Making request to:", `/api/projects/${projectId}`);

      // Let's catch and inspect fetch errors more carefully
      try {
        const response = await api.get(`projects/${projectId}`);
        const data = response as any;

        console.log("📦 RAW API Response:", data);
        console.log("📦 Response keys:", Object.keys(data || {}));
        console.log("📦 data.project:", data.project);
        console.log("📦 data.project keys:", Object.keys(data.project || {}));

        console.log("📦 Project data received:", {
          projectId: data.project?._id,
          projectTitle: data.project?.title,
          deliverablesCount: data.project?.deliverables?.length || 0,
          deliverables: data.project?.deliverables || [],
        });

        setProject(data.project);
        console.log("✅ Project state updated");

        // Fetch member details after setting project
        if (data.project?.members?.length > 0) {
          console.log(
            "👥 Fetching member details for",
            data.project.members.length,
            "members"
          );
          await fetchMemberDetails(
            data.project.members.map((m: any) => m.userId)
          );
        }
      } catch (apiError: any) {
        console.error("💥 API Error details:", {
          message: apiError.message,
          status: apiError.status,
          code: apiError.code,
          fullError: apiError,
        });
        throw apiError;
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
    if (!api) {
      console.log("No API client available for fetching member details");
      return;
    }

    try {
      // Use the project-specific users endpoint (no admin required)
      const response = await api.get("projects/users");
      const data = response as any;

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
    if (!project || !api) return;

    try {
      const response = await api.put(`projects/${project._id}`, {
        status: newStatus,
      });
      const updatedProject = response as any;

      setProject(updatedProject.project);

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

  const inviteUser = async (email: string, role: string) => {
    if (!api) {
      toast({
        title: "Authentication Required",
        description: "Please log in to invite users",
        variant: "destructive",
      });
      return;
    }

    try {
      setInvitingUser(true);
      await api.post("projects/users", {
        projectId: projectId,
        userEmail: email,
        role: role,
      });

      toast({
        title: "Success",
        description: `User invited to project successfully`,
      });

      // Refresh the project data to show the new user
      if (project) {
        await fetchProject();
      }
    } catch (error: any) {
      console.error("Error inviting user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to invite user",
        variant: "destructive",
      });
    } finally {
      setInvitingUser(false);
    }
  };

  if (status === "loading" || loading || (session && !user)) {
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
          <Suspense fallback={<PageSkeleton />}>
            <ProjectHeader
              project={project}
              onStatusChange={handleStatusChange}
              onBack={handleBack}
            />
          </Suspense>

          {/* Main Content Tabs */}
          <Suspense fallback={<PageSkeleton />}>
            <ProjectTabs
              project={project}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              memberDetails={memberDetails}
              onProjectUpdate={fetchProject}
            />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
