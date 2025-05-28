import { format } from "date-fns";
import { Deliverable, DeliverableStatus } from "@/types/deliverable";

export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export const formatDeliverableDuration = (deliverable: Deliverable): string => {
  if (deliverable.type === "Photo Gallery") {
    return "N/A";
  }
  return formatDuration(deliverable.duration);
};

export const isValidDate = (date: any): boolean => {
  return date && !isNaN(new Date(date).getTime());
};

export const safeFormat = (date: any, formatStr: string): string => {
  if (!isValidDate(date)) {
    return "Invalid Date";
  }
  try {
    return format(new Date(date), formatStr);
  } catch (error) {
    return "Invalid Date";
  }
};

export const safeDateValue = (dateString: string): Date | undefined => {
  if (!dateString) return undefined;
  try {
    const date = new Date(dateString);
    return isValidDate(date) ? date : undefined;
  } catch (error) {
    return undefined;
  }
};

export const getStatusColor = (status: DeliverableStatus): string => {
  switch (status) {
    case "not_started":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    case "in_progress":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    case "done":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }
};

export const getStatusText = (status: DeliverableStatus): string => {
  switch (status) {
    case "not_started":
      return "Not Started";
    case "in_progress":
      return "In Progress";
    case "done":
      return "Done";
    default:
      return "Unknown";
  }
};

export const getPillColor = (field: string, value: string): string => {
  if (field === "platform") {
    switch (value.toLowerCase()) {
      case "youtube":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "instagram":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300";
      case "facebook":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "tiktok":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  }
  return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
};

export const getRelevantUsers = (deliverableType: string, allUsers: any[]) => {
  switch (deliverableType.toLowerCase()) {
    case "video":
    case "short":
    case "reel":
      return allUsers.filter((user) =>
        user.creativeRoles.includes("video_editor")
      );
    case "photo gallery":
      return allUsers.filter((user) =>
        user.creativeRoles.includes("photographer")
      );
    default:
      return allUsers;
  }
};
