import { ProjectStatus } from "@/types/project";

export const KNOWN_PROJECT_STATUSES: ProjectStatus[] = [
  "draft",
  "active",
  "in_review",
  "completed",
  "archived",
];

const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "Draft",
  active: "Active",
  in_review: "In Review",
  completed: "Completed",
  archived: "Archived",
};

const STATUS_COLORS: Record<ProjectStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  active: "bg-blue-100 text-blue-800",
  in_review: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  archived: "bg-gray-100 text-gray-600",
};

export function formatProjectStatus(
  status: ProjectStatus | string | null | undefined
): string {
  if (!status) {
    return "Unknown";
  }

  if (typeof status === "string") {
    const knownLabel = STATUS_LABELS[status as ProjectStatus];
    if (knownLabel) {
      return knownLabel;
    }

    return status.replace(/_/g, " ");
  }

  return String(status);
}

export function getProjectStatusColor(
  status: ProjectStatus | string | null | undefined
): string {
  if (typeof status === "string") {
    const color = STATUS_COLORS[status as ProjectStatus];
    if (color) {
      return color;
    }
  }

  return "bg-gray-100 text-gray-800";
}
