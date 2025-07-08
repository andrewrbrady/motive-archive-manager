"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/hooks/useFirebaseAuth";
import { useRouter } from "next/navigation";
import { Project, ProjectStatus, ProjectType } from "@/types/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageTitle } from "@/components/ui/PageTitle";
import { Plus, Search, Calendar, Users, ImageIcon } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { LoadingSpinner } from "@/components/ui/loading";
import { useProjects } from "@/lib/hooks/query/useProjects";
import { toast } from "@/components/ui/use-toast";
import { ProjectImageDisplay } from "@/components/projects/ProjectImageDisplay";

export default function ProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Use the new React Query hook for projects with image loading
  const {
    data: projectsData,
    isLoading,
    error,
    refetch: refreshProjects,
  } = useProjects({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    includeImages: true, // Always include images for cover photos
    limit: 50,
    page: 1,
  });

  const projects = projectsData?.projects || [];

  // Handle error state
  useEffect(() => {
    if (error) {
      console.error("ProjectsPage: Error fetching projects:", error);
      toast({
        title: "Error",
        description: "Failed to load projects. Please try again.",
        variant: "destructive",
      });
    }
  }, [error]);

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case "active":
        return "bg-blue-100 text-blue-800";
      case "in_review":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "archived":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeLabel = (type: ProjectType) => {
    switch (type) {
      case "documentation":
        return "Documentation";
      case "media_campaign":
        return "Media Campaign";
      case "event_coverage":
        return "Event Coverage";
      case "custom":
        return "Custom";
      default:
        return type;
    }
  };

  // Show loading while authentication is being handled
  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container-wide px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <LoadingSpinner size="lg" />
              <div className="text-lg">Loading projects...</div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container-wide px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <div className="text-lg text-red-600">
                Error loading projects: {error?.message || "Unknown error"}
              </div>
              <Button onClick={() => refreshProjects()}>Try Again</Button>
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
          <PageTitle title="Projects" count={projects.length} />

          {/* Search, Filters, and Controls Row */}
          <div className="flex flex-wrap items-center gap-4 justify-between">
            {/* Left side: Search and Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 min-w-[300px]">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1"
                />
              </div>

              <CustomDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "all", label: "All Status" },
                  { value: "active", label: "Active" },
                  { value: "in_review", label: "In Review" },
                  { value: "completed", label: "Completed" },
                  { value: "archived", label: "Archived" },
                ]}
                placeholder="Status"
                className="w-[150px]"
              />

              <CustomDropdown
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: "all", label: "All Types" },
                  { value: "documentation", label: "Documentation" },
                  { value: "media_campaign", label: "Media Campaign" },
                  { value: "event_coverage", label: "Event Coverage" },
                  { value: "custom", label: "Custom" },
                ]}
                placeholder="Type"
                className="w-[150px]"
              />
            </div>

            {/* Right side: Add Project Button */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <Button onClick={() => router.push("/projects/new")}>
                <Plus className="mr-2 h-4 w-4" />
                Add Project
              </Button>
            </div>
          </div>

          {/* Projects Grid */}
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">No projects found</div>
              <Button onClick={() => router.push("/projects/new")}>
                Create your first project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => {
                return (
                  <Card
                    key={project._id}
                    className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                    onClick={() => router.push(`/projects/${project._id}`)}
                  >
                    {/* Primary Image - Now properly loaded from React Query */}
                    <div className="relative aspect-[16/9]">
                      <ProjectImageDisplay
                        primaryImageUrl={project.primaryImageUrl}
                        primaryImageId={project.primaryImageId}
                        projectTitle={project.title}
                        className="w-full h-full"
                      />
                    </div>

                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg line-clamp-1">
                          {project.title}
                        </CardTitle>
                        <Badge
                          className={`ml-2 ${getStatusColor(project.status)}`}
                        >
                          {project.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {project.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {project.timeline?.startDate
                                ? format(
                                    new Date(project.timeline.startDate),
                                    "MMM d"
                                  )
                                : "No date"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{project.members?.length || 0}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium">
                            {getTypeLabel(project.type)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
