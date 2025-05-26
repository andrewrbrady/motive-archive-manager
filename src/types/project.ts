import { ObjectId } from "mongodb";

export type ProjectStatus =
  | "draft"
  | "active"
  | "in_review"
  | "completed"
  | "archived";

export type ProjectPriority = "low" | "medium" | "high" | "urgent";

export type ProjectType =
  | "documentation"
  | "media_campaign"
  | "event_coverage"
  | "custom";

export type ProjectMemberRole =
  | "owner"
  | "manager"
  | "photographer"
  | "editor"
  | "writer"
  | "viewer";

export interface ProjectBudget {
  total: number;
  spent: number;
  remaining: number;
  currency: string;
  expenses: ProjectExpense[];
}

export interface ProjectExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
  receipt?: string;
  approvedBy?: string;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  description?: string;
  dueDate: Date;
  completed: boolean;
  completedAt?: Date;
  dependencies?: string[];
  assignedTo?: string[];
}

export interface ProjectTimeline {
  startDate: Date;
  endDate?: Date;
  milestones: ProjectMilestone[];
  estimatedDuration?: number; // in days
}

export interface ProjectMember {
  userId: string;
  role: ProjectMemberRole;
  permissions: string[];
  joinedAt: Date;
  hourlyRate?: number;
  hoursLogged?: number;
}

export interface ProjectAsset {
  id: string;
  type: "gallery" | "image" | "deliverable" | "document";
  referenceId: string;
  name: string;
  url?: string;
  addedAt: Date;
  addedBy: string;
}

export interface ProjectDeliverable {
  id: string;
  title: string;
  description?: string;
  type: "document" | "video" | "image" | "presentation" | "other";
  status: "pending" | "in_progress" | "review" | "completed" | "rejected";
  dueDate: Date;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface ProjectTemplate {
  _id?: string;
  name: string;
  description: string;
  type: ProjectType;
  defaultTimeline: Omit<ProjectTimeline, "startDate" | "endDate">;
  defaultBudget?: Partial<ProjectBudget>;
  requiredRoles: ProjectMemberRole[];
  defaultTasks: string[];
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  _id?: string;
  title: string;
  description: string;
  type: ProjectType;
  status: ProjectStatus;
  priority: ProjectPriority;

  // Relationships
  clientId?: string;
  carIds: string[];
  galleryIds: string[];
  deliverableIds: string[];
  eventIds: string[];

  // Team and permissions
  members: ProjectMember[];
  ownerId: string;

  // Timeline and milestones
  timeline: ProjectTimeline;

  // Budget tracking
  budget?: ProjectBudget;

  // Assets and deliverables
  assets: ProjectAsset[];

  // Embedded deliverables
  deliverables: ProjectDeliverable[];

  // Progress tracking
  progress: {
    percentage: number;
    completedTasks: number;
    totalTasks: number;
    lastUpdated: Date;
  };

  // Metadata
  tags: string[];
  notes?: string;
  templateId?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  archivedAt?: Date;
}

// API Response types
export interface ProjectListResponse {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
}

export interface ProjectResponse {
  project: Project;
}

// Form types
export interface CreateProjectRequest {
  title: string;
  description: string;
  type: ProjectType;
  priority: ProjectPriority;
  clientId?: string;
  carIds?: string[];
  templateId?: string;
  timeline: {
    startDate: Date;
    endDate?: Date;
    estimatedDuration?: number;
  };
  budget?: {
    total: number;
    currency: string;
  };
  members?: {
    userId: string;
    role: ProjectMemberRole;
  }[];
  tags?: string[];
}

export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {
  status?: ProjectStatus;
  progress?: {
    percentage: number;
    completedTasks: number;
    totalTasks: number;
  };
}

// Filter and search types
export interface ProjectFilters {
  status?: ProjectStatus[];
  type?: ProjectType[];
  priority?: ProjectPriority[];
  clientId?: string;
  ownerId?: string;
  memberUserId?: string;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ProjectSearchParams {
  search?: string;
  filters?: ProjectFilters;
  sort?: string;
  page?: number;
  limit?: number;
}
