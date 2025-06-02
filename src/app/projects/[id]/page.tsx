"use client";

import { useState, useEffect, use, lazy, Suspense, useRef } from "react";
import { useSession, useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useRouter, useParams } from "next/navigation";
import { Project, ProjectStatus } from "@/types/project";
import { toast } from "@/components/ui/use-toast";
import { useAPI } from "@/hooks/useAPI";
import { Loader2 } from "lucide-react";

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

// ✅ Enhanced loading fallback with authentication context
const PageSkeleton = ({ authMessage }: { authMessage?: string }) => (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="h-32 bg-muted rounded"></div>
        <div className="h-64 bg-muted rounded"></div>
      </div>
      {authMessage && (
        <div className="fixed bottom-4 right-4 bg-background border rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">{authMessage}</span>
          </div>
        </div>
      )}
    </div>
  </div>
);

// ✅ Enhanced error component with retry functionality
const ProjectError = ({
  error,
  onRetry,
  onBack,
}: {
  error: string;
  onRetry?: () => void;
  onBack: () => void;
}) => (
  <div className="min-h-screen bg-background">
    <main className="container-wide px-6 py-8">
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="text-lg text-red-600 mb-4">{error}</div>
          <div className="flex gap-3 justify-center">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
              >
                Try Again
              </button>
            )}
            <button
              onClick={onBack}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Back to Projects
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
);

interface ProjectDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ProjectDetailPage() {
  const { data: session, status } = useSession();
  const { user, isAuthenticated, loading: authLoading } = useFirebaseAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const api = useAPI();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitingUser, setInvitingUser] = useState(false);
  const initialLoadRef = useRef(false);
  const retryAttemptRef = useRef(0);
  const maxRetries = 2;

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

  // ✅ Enhanced authentication and load effect with defensive handling
  useEffect(() => {
    console.log("ProjectDetailPage: Auth useEffect triggered", {
      status,
      sessionExists: !!session,
      userExists: !!user,
      isAuthenticated,
      authLoading,
      apiReady: !!api,
      initialLoadDone: initialLoadRef.current,
    });

    // ✅ Enhanced loading state management
    if (status === "loading" || authLoading) {
      console.log("ProjectDetailPage: Authentication still loading...");
      return;
    }

    // ✅ Defensive authentication check with graceful fallback
    if (status === "unauthenticated" || !isAuthenticated) {
      console.log(
        "ProjectDetailPage: User not authenticated, redirecting to signin"
      );
      router.push("/auth/signin");
      return;
    }

    // ✅ Wait for both session and Firebase user (defensive)
    if (!session?.user || !user) {
      console.log(
        "ProjectDetailPage: Authentication incomplete - session or user missing",
        { hasSession: !!session?.user, hasUser: !!user }
      );
      return;
    }

    // ✅ Ensure API client is ready before proceeding
    if (!api) {
      console.log("ProjectDetailPage: API client not ready yet, waiting...");
      return;
    }

    if (!initialLoadRef.current) {
      console.log(
        "ProjectDetailPage: Initial load - authentication complete, fetching project"
      );
      initialLoadRef.current = true;
      fetchProject();
    }
  }, [session, status, user, isAuthenticated, authLoading, api, projectId]);

  // ✅ Enhanced fetchProject with comprehensive error handling
  const fetchProject = async () => {
    console.log("🔄 Fetching project data...");
    try {
      setLoading(true);
      setError(null); // Clear previous errors

      // ✅ Defensive API client check
      if (!api) {
        console.log("ProjectDetailPage: No API client available");
        throw new Error("Authentication required - please refresh the page");
      }

      console.log("🌐 Making request to:", `/api/projects/${projectId}`);

      // ✅ Enhanced error handling with specific error types
      try {
        const response = await api.get(`projects/${projectId}`);
        const data = response as any;

        console.log("📦 Project data received:", {
          projectId: data.project?._id,
          projectTitle: data.project?.title,
          deliverablesCount: data.project?.deliverables?.length || 0,
        });

        if (!data.project) {
          throw new Error("Project data not found in response");
        }

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

        // Reset retry counter on success
        retryAttemptRef.current = 0;
      } catch (apiError: any) {
        console.error("💥 API Error details:", {
          message: apiError.message,
          status: apiError.status,
          code: apiError.code,
          retryAttempt: retryAttemptRef.current,
        });

        // ✅ Enhanced error handling based on error type
        if (apiError.status === 401) {
          throw new Error("Authentication failed - please sign in again");
        } else if (apiError.status === 403) {
          throw new Error(
            "Access denied - you don't have permission to view this project"
          );
        } else if (apiError.status === 404) {
          throw new Error(
            "Project not found - it may have been deleted or you don't have access"
          );
        } else if (apiError.message?.includes("Failed to fetch")) {
          throw new Error(
            "Network error - please check your connection and try again"
          );
        } else {
          throw new Error(apiError.message || "Failed to load project");
        }
      }
    } catch (err) {
      console.error("💥 Error fetching project:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
      console.log("🏁 Project fetch completed");
    }
  };

  // ✅ Enhanced retry functionality
  const handleRetry = () => {
    if (retryAttemptRef.current < maxRetries) {
      retryAttemptRef.current++;
      console.log(
        `🔄 Retrying project fetch (attempt ${retryAttemptRef.current}/${maxRetries})`
      );
      fetchProject();
    } else {
      console.log("❌ Max retry attempts reached");
      toast({
        title: "Error",
        description:
          "Unable to load project after multiple attempts. Please refresh the page.",
        variant: "destructive",
      });
    }
  };

  // ✅ Enhanced fetchMemberDetails with defensive error handling
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
        console.warn(
          "Invalid response format for member details, continuing without member info"
        );
        return;
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
      // ✅ Don't fail the entire page if member details fail
      toast({
        title: "Warning",
        description: "Could not load team member details",
        variant: "default",
      });
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

  // ✅ Enhanced inviteUser with comprehensive error handling
  const inviteUser = async (email: string, role: string) => {
    if (!api) {
      toast({
        title: "Authentication Required",
        description: "Please refresh the page and try again",
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
      const errorMessage = error.message || "Failed to invite user";

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setInvitingUser(false);
    }
  };

  // ✅ Enhanced loading state with better context
  if (status === "loading" || authLoading || loading) {
    const authMessage =
      status === "loading"
        ? "Authenticating..."
        : authLoading
          ? "Verifying credentials..."
          : loading
            ? "Loading project..."
            : undefined;

    return <PageSkeleton authMessage={authMessage} />;
  }

  // ✅ Enhanced error handling with retry capability
  if (error) {
    return (
      <ProjectError
        error={error}
        onRetry={retryAttemptRef.current < maxRetries ? handleRetry : undefined}
        onBack={handleBack}
      />
    );
  }

  // ✅ Enhanced project not found handling
  if (!project) {
    return (
      <ProjectError
        error="Project not found or still loading"
        onRetry={handleRetry}
        onBack={handleBack}
      />
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
