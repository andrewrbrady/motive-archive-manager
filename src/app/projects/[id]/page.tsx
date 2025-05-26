"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { PageTitle } from "@/components/ui/PageTitle";
import {
  ArrowLeft,
  Calendar,
  Users,
  DollarSign,
  Clock,
  Target,
  CheckCircle,
  Circle,
  AlertCircle,
  Edit,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import {
  Project,
  ProjectStatus,
  ProjectPriority,
  ProjectType,
  ProjectMilestone,
} from "@/types/project";
import { toast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    fetchProject();
  }, [session, status, resolvedParams.id]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${resolvedParams.id}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Project not found");
        }
        throw new Error("Failed to fetch project");
      }

      const data = await response.json();
      setProject(data.project);
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

  const getDaysRemaining = () => {
    if (!project?.timeline.endDate) return null;
    const today = new Date();
    const endDate = new Date(project.timeline.endDate);
    const days = differenceInDays(endDate, today);
    return days;
  };

  const getCompletedMilestones = () => {
    if (!project) return 0;
    return project.timeline.milestones.filter((m) => m.completed).length;
  };

  const getOverdueMilestones = () => {
    if (!project) return 0;
    const today = new Date();
    return project.timeline.milestones.filter(
      (m) => !m.completed && new Date(m.dueDate) < today
    ).length;
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
              <Button onClick={() => router.push("/projects")}>
                Back to Projects
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining();
  const completedMilestones = getCompletedMilestones();
  const overdueMilestones = getOverdueMilestones();

  return (
    <div className="min-h-screen bg-background">
      <main className="container-wide px-6 py-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Header */}
          <PageTitle title={project.title}>
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("active")}
                  >
                    Mark as Active
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("in_review")}
                  >
                    Mark as In Review
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("completed")}
                  >
                    Mark as Completed
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("archived")}
                  >
                    Archive Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push("/projects")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Projects
              </Button>
            </div>
          </PageTitle>

          {/* Project Info Bar */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(project.status)}>
                {project.status.replace("_", " ")}
              </Badge>
              <Badge className={getPriorityColor(project.priority)}>
                {project.priority}
              </Badge>
              <Badge variant="outline">{getTypeLabel(project.type)}</Badge>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Started{" "}
                {format(new Date(project.timeline.startDate), "MMM d, yyyy")}
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {project.members.length} members
              </div>
              {project.budget && (
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {project.budget.currency}{" "}
                  {project.budget.total.toLocaleString()}
                </div>
              )}
              {daysRemaining !== null && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {daysRemaining > 0
                    ? `${daysRemaining} days left`
                    : daysRemaining === 0
                      ? "Due today"
                      : `${Math.abs(daysRemaining)} days overdue`}
                </div>
              )}
            </div>
          </div>

          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Progress</p>
                    <p className="text-2xl font-bold">
                      {project.progress.percentage}%
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
                <Progress
                  value={project.progress.percentage}
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Milestones</p>
                    <p className="text-2xl font-bold">
                      {completedMilestones}/{project.timeline.milestones.length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Team Members
                    </p>
                    <p className="text-2xl font-bold">
                      {project.members.length}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Overdue</p>
                    <p className="text-2xl font-bold text-red-600">
                      {overdueMilestones}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-5 bg-transparent border rounded-md h-auto p-1 gap-1">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-transparent data-[state=active]:border data-[state=active]:border-border data-[state=active]:shadow-sm rounded-md data-[state=inactive]:border-transparent border hover:bg-accent/10"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="timeline"
                className="data-[state=active]:bg-transparent data-[state=active]:border data-[state=active]:border-border data-[state=active]:shadow-sm rounded-md data-[state=inactive]:border-transparent border hover:bg-accent/10"
              >
                Timeline
              </TabsTrigger>
              <TabsTrigger
                value="team"
                className="data-[state=active]:bg-transparent data-[state=active]:border data-[state=active]:border-border data-[state=active]:shadow-sm rounded-md data-[state=inactive]:border-transparent border hover:bg-accent/10"
              >
                Team
              </TabsTrigger>
              <TabsTrigger
                value="assets"
                className="data-[state=active]:bg-transparent data-[state=active]:border data-[state=active]:border-border data-[state=active]:shadow-sm rounded-md data-[state=inactive]:border-transparent border hover:bg-accent/10"
              >
                Assets
              </TabsTrigger>
              <TabsTrigger
                value="deliverables"
                className="data-[state=active]:bg-transparent data-[state=active]:border data-[state=active]:border-border data-[state=active]:shadow-sm rounded-md data-[state=inactive]:border-transparent border hover:bg-accent/10"
              >
                Deliverables
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Description */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Project Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        {project.description}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Recent Milestones */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Milestones</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {project.timeline.milestones
                          .slice(0, 5)
                          .map((milestone) => (
                            <div
                              key={milestone.id}
                              className="flex items-center gap-3 p-3 border rounded-lg"
                            >
                              {milestone.completed ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                              )}
                              <div className="flex-1">
                                <div className="font-medium">
                                  {milestone.title}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Due{" "}
                                  {format(
                                    new Date(milestone.dueDate),
                                    "MMM d, yyyy"
                                  )}
                                </div>
                              </div>
                              {!milestone.completed &&
                                new Date(milestone.dueDate) < new Date() && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    Overdue
                                  </Badge>
                                )}
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  {/* Project Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Project Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="text-sm font-medium">Type</div>
                        <div className="text-sm text-muted-foreground">
                          {getTypeLabel(project.type)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Priority</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {project.priority}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Created</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(project.createdAt), "MMM d, yyyy")}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Last Updated</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(project.updatedAt), "MMM d, yyyy")}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Budget Summary */}
                  {project.budget && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Budget Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm">Total Budget</span>
                          <span className="font-medium">
                            {project.budget.currency}{" "}
                            {project.budget.total.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Spent</span>
                          <span className="font-medium">
                            {project.budget.currency}{" "}
                            {project.budget.spent.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Remaining</span>
                          <span className="font-medium">
                            {project.budget.currency}{" "}
                            {project.budget.remaining.toLocaleString()}
                          </span>
                        </div>
                        <Progress
                          value={
                            (project.budget.spent / project.budget.total) * 100
                          }
                          className="mt-2"
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Tags */}
                  {project.tags.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Tags</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {project.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Project Timeline</CardTitle>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Milestone
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {project.timeline.milestones.map((milestone, index) => (
                      <div
                        key={milestone.id}
                        className="flex items-start gap-4 p-4 border rounded-lg"
                      >
                        <div className="flex flex-col items-center">
                          {milestone.completed ? (
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          ) : (
                            <Circle className="h-6 w-6 text-muted-foreground" />
                          )}
                          {index < project.timeline.milestones.length - 1 && (
                            <div className="w-0.5 h-8 bg-border mt-2" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{milestone.title}</h4>
                              {milestone.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {milestone.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span>
                                  Due{" "}
                                  {format(
                                    new Date(milestone.dueDate),
                                    "MMM d, yyyy"
                                  )}
                                </span>
                                {milestone.assignedTo &&
                                  milestone.assignedTo.length > 0 && (
                                    <span>
                                      {milestone.assignedTo.length} assigned
                                    </span>
                                  )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!milestone.completed &&
                                new Date(milestone.dueDate) < new Date() && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    Overdue
                                  </Badge>
                                )}
                              {milestone.completed && milestone.completedAt && (
                                <Badge variant="secondary" className="text-xs">
                                  Completed{" "}
                                  {format(
                                    new Date(milestone.completedAt),
                                    "MMM d"
                                  )}
                                </Badge>
                              )}
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Team Tab */}
            <TabsContent value="team" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Team Members</CardTitle>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Member
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {project.members.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-medium">
                              User {member.userId}
                            </div>
                            <div className="text-sm text-muted-foreground capitalize">
                              {member.role} • Joined{" "}
                              {format(new Date(member.joinedAt), "MMM d, yyyy")}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {member.role}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Assets Tab */}
            <TabsContent value="assets" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Project Assets</CardTitle>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Asset
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {project.assets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No assets added yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {project.assets.map((asset) => (
                        <div
                          key={asset.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{asset.name}</div>
                            <div className="text-sm text-muted-foreground capitalize">
                              {asset.type} • Added{" "}
                              {format(new Date(asset.addedAt), "MMM d, yyyy")}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Deliverables Tab */}
            <TabsContent value="deliverables" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Deliverables</CardTitle>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Deliverable
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    No deliverables created yet
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
