"use client";

import { useState, useEffect, use, lazy, Suspense, useRef } from "react";
import { useSession, useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useRouter, useParams } from "next/navigation";
import { Project, ProjectStatus } from "@/types/project";
import { toast } from "@/components/ui/use-toast";
import {
  useProject,
  useUpdateProjectStatus,
} from "@/lib/hooks/query/useProjects";
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

  // Use the new React Query hooks
  const {
    data: project,
    isLoading,
    error,
    refetch: refreshProject,
  } = useProject(projectId);

  const updateStatusMutation = useUpdateProjectStatus();

  const [invitingUser, setInvitingUser] = useState(false);
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

  // Fetch member details when project is loaded
  useEffect(() => {
    if (project?.members && project.members.length > 0) {
      console.log(
        "👥 Fetching member details for",
        project.members.length,
        "members"
      );
      fetchMemberDetails(project.members.map((m: any) => m.userId));
    }
  }, [project?.members]);

  // ✅ Enhanced retry functionality
  const handleRetry = () => {
    if (retryAttemptRef.current < maxRetries) {
      retryAttemptRef.current++;
      console.log(
        `🔄 Retrying project fetch (attempt ${retryAttemptRef.current}/${maxRetries})`
      );
      refreshProject();
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
    if (!project) return;

    try {
      await updateStatusMutation.mutateAsync({
        projectId: project._id!,
        status: newStatus,
      });

      toast({
        title: "Success",
        description: "Project status updated successfully",
      });
    } catch (error) {
      console.error("Error updating project status:", error);
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

      // Refresh project to show new member
      refreshProject();
    } catch (error) {
      console.error("Error inviting user:", error);
      toast({
        title: "Error",
        description: "Failed to invite user to project",
        variant: "destructive",
      });
    } finally {
      setInvitingUser(false);
    }
  };

  // ✅ Show loading while checking authentication
  if (status === "loading" || authLoading) {
    return <PageSkeleton authMessage="Checking authentication..." />;
  }

  // ✅ Show loading while fetching project data
  if (isLoading) {
    return <PageSkeleton authMessage="Loading project data..." />;
  }

  // ✅ Enhanced error handling with better UX
  if (error) {
    const errorMessage = error?.message || "Failed to load project";

    // Special handling for different error types
    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      return (
        <ProjectError
          error="Project not found. It may have been deleted or you don't have access."
          onBack={handleBack}
        />
      );
    }

    if (
      errorMessage.includes("403") ||
      errorMessage.includes("access denied")
    ) {
      return (
        <ProjectError
          error="Access denied. You don't have permission to view this project."
          onBack={handleBack}
        />
      );
    }

    if (
      errorMessage.includes("401") ||
      errorMessage.includes("authentication")
    ) {
      return (
        <ProjectError
          error="Authentication failed. Please sign in again."
          onBack={handleBack}
        />
      );
    }

    return (
      <ProjectError
        error={errorMessage}
        onRetry={retryAttemptRef.current < maxRetries ? handleRetry : undefined}
        onBack={handleBack}
      />
    );
  }

  // ✅ Show error if project data is missing
  if (!project) {
    return (
      <ProjectError
        error="Project data not found"
        onRetry={handleRetry}
        onBack={handleBack}
      />
    );
  }

  // ✅ Main render with all data available
  return (
    <div className="min-h-screen bg-background">
      <main className="container-wide px-6 py-8">
        <div className="space-y-6">
          <Suspense fallback={<PageSkeleton />}>
            <ProjectHeader
              project={project}
              onStatusChange={handleStatusChange}
              onBack={handleBack}
            />
          </Suspense>

          <Suspense fallback={<PageSkeleton />}>
            <ProjectTabs
              project={project}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              memberDetails={memberDetails}
              onProjectUpdate={refreshProject}
            />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
