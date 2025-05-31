"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "@/hooks/useFirebaseAuth";
import { useAuthenticatedFetch } from "@/hooks/useFirebaseAuth";
import { useRouter } from "next/navigation";
import {
  Project,
  ProjectListResponse,
  ProjectStatus,
  ProjectType,
} from "@/types/project";
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
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  DollarSign,
  ImageIcon,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { LoadingSpinner } from "@/components/ui/loading";

export default function ProjectsPage() {
  const { data: session, status } = useSession();
  const { authenticatedFetch } = useAuthenticatedFetch();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const fetchingRef = useRef(false);
  const initialLoadRef = useRef(false);

  // State for tracking image loading for each project
  const [imageStates, setImageStates] = useState<
    Record<
      string,
      {
        loading: boolean;
        url: string | null;
        error: boolean;
      }
    >
  >({});

  const fetchProjects = async () => {
    if (fetchingRef.current) {
      console.log("ProjectsPage: Already fetching, skipping...");
      return;
    }

    try {
      fetchingRef.current = true;
      console.log("ProjectsPage: Starting to fetch projects...");
      setLoading(true);

      const params = new URLSearchParams();

      if (search) params.append("search", search);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (typeFilter !== "all") params.append("type", typeFilter);

      // ✅ Request projects WITH their primary images in one call
      params.append("includeImages", "true");

      const url = `/api/projects?${params.toString()}`;
      console.log("ProjectsPage: Fetching from URL:", url);

      const response = await authenticatedFetch(url);
      const data: ProjectListResponse = await response.json();
      console.log("ProjectsPage: Received data:", {
        projectsCount: data.projects.length,
        total: data.total,
        page: data.page,
        limit: data.limit,
      });

      setProjects(data.projects);

      // Initialize image states for projects that have primary images
      const newImageStates: typeof imageStates = {};
      data.projects.forEach((project) => {
        if (project.primaryImageUrl) {
          newImageStates[project._id!] = {
            loading: false,
            url: project.primaryImageUrl,
            error: false,
          };
        } else {
          newImageStates[project._id!] = {
            loading: false,
            url: null,
            error: false,
          };
        }
      });
      setImageStates(newImageStates);

      setError(null);
    } catch (error) {
      console.error("ProjectsPage: Error fetching projects:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // Simplified effect - just fetch when we have session
  useEffect(() => {
    // Only fetch when authenticated
    if (
      status === "authenticated" &&
      session?.user &&
      !initialLoadRef.current
    ) {
      console.log("ProjectsPage: Initial load - fetching projects");
      initialLoadRef.current = true;
      fetchProjects();
    }
  }, [status, session]);

  // Search and filter effect
  useEffect(() => {
    if (initialLoadRef.current && status === "authenticated" && session?.user) {
      console.log("ProjectsPage: Search/filter changed, refetching projects");
      fetchProjects();
    }
  }, [search, statusFilter, typeFilter, status, session]);

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

  // Show loading while authentication is being handled by AuthGuard
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container-wide px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading projects...</div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container-wide px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-red-600">Error: {error}</div>
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
                const imageState = imageStates[project._id!] || {
                  loading: false,
                  url: null,
                  error: false,
                };

                return (
                  <Card
                    key={project._id}
                    className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                    onClick={() => router.push(`/projects/${project._id}`)}
                  >
                    {/* Primary Image */}
                    <div className="relative aspect-[16/9]">
                      {imageState.loading ? (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <LoadingSpinner size="lg" />
                        </div>
                      ) : imageState.url ? (
                        <Image
                          src={imageState.url}
                          alt={project.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          onError={() => {
                            setImageStates((prev) => ({
                              ...prev,
                              [project._id!]: {
                                ...prev[project._id!],
                                error: true,
                                url: null,
                              },
                            }));
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
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
