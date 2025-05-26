"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageTitle } from "@/components/ui/PageTitle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Users,
  DollarSign,
  Clock,
  MoreHorizontal,
  Edit,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import {
  Project,
  ProjectStatus,
  ProjectPriority,
  ProjectType,
} from "@/types/project";

interface ProjectHeaderProps {
  project: Project;
  onStatusChange: (status: ProjectStatus) => void;
  onBack: () => void;
}

export function ProjectHeader({
  project,
  onStatusChange,
  onBack,
}: ProjectHeaderProps) {
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
    if (!project.timeline.endDate) return null;
    const today = new Date();
    const endDate = new Date(project.timeline.endDate);
    const days = differenceInDays(endDate, today);
    return days;
  };

  const daysRemaining = getDaysRemaining();

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <PageTitle title={project.title}>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onStatusChange("active")}>
                Mark as Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange("in_review")}>
                Mark as In Review
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange("completed")}>
                Mark as Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange("archived")}>
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
            onClick={onBack}
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
            <CalendarIcon className="h-4 w-4" />
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
              {project.budget.currency} {project.budget.total.toLocaleString()}
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
    </div>
  );
}
