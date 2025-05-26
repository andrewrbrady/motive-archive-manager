"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Project,
  ProjectListResponse,
  ProjectStatus,
  ProjectType,
  ProjectPriority,
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
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

export default function ProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    fetchProjects();
  }, [session, status, search, statusFilter, typeFilter, priorityFilter]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (search) params.append("search", search);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (priorityFilter !== "all") params.append("priority", priorityFilter);

      const response = await fetch(`/api/projects?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }

      const data: ProjectListResponse = await response.json();
      setProjects(data.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
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

  const getPriorityColor = (priority: ProjectPriority) => {
    switch (priority) {
      case "low":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "urgent":
        return "bg-red-100 text-red-800";
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
                  { value: "draft", label: "Draft" },
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

              <CustomDropdown
                value={priorityFilter}
                onChange={setPriorityFilter}
                options={[
                  { value: "all", label: "All Priorities" },
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                  { value: "urgent", label: "Urgent" },
                ]}
                placeholder="Priority"
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
              {projects.map((project) => (
                <Card
                  key={project._id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => router.push(`/projects/${project._id}`)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-lg line-clamp-2">
                        {project.title}
                      </CardTitle>
                      <Badge className={getPriorityColor(project.priority)}>
                        {project.priority}
                      </Badge>
                    </div>
                    <div className="flex gap-2 mb-2">
                      <Badge className={getStatusColor(project.status)}>
                        {project.status.replace("_", " ")}
                      </Badge>
                      <Badge variant="outline">
                        {getTypeLabel(project.type)}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-3">
                      {project.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3">
                      {/* Progress */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${project.progress.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          {project.progress.percentage}%
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="flex justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(
                            new Date(project.timeline.startDate),
                            "MMM d"
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {project.members.length}
                        </div>
                        {project.budget && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {project.budget.currency}{" "}
                            {project.budget.total.toLocaleString()}
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {project.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {project.tags.slice(0, 3).map((tag, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {project.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{project.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
