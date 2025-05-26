import mongoose, { Document, Model } from "mongoose";
import {
  Project as IProject,
  ProjectStatus,
  ProjectPriority,
  ProjectType,
  ProjectMemberRole,
  ProjectMember,
  ProjectMilestone,
  ProjectTimeline,
  ProjectBudget,
  ProjectExpense,
  ProjectAsset,
  ProjectDeliverable,
} from "@/types/project";

// Project document interface
export interface IProjectDocument extends Document, Omit<IProject, "_id"> {}

// Project methods interface
export interface IProjectMethods {
  addMember(userId: string, role: ProjectMemberRole): Promise<void>;
  removeMember(userId: string): Promise<void>;
  updateProgress(): Promise<void>;
  addAsset(asset: Omit<ProjectAsset, "id" | "addedAt">): Promise<void>;
  addMilestone(milestone: Omit<ProjectMilestone, "id">): Promise<void>;
  completeMilestone(milestoneId: string): Promise<void>;
}

// Project model type
export type ProjectModel = Model<
  IProjectDocument,
  Record<string, never>,
  IProjectMethods
>;

// Project expense schema
const projectExpenseSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString(),
  },
  description: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  category: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  receipt: String,
  approvedBy: String,
});

// Project budget schema
const projectBudgetSchema = new mongoose.Schema({
  total: {
    type: Number,
    required: true,
    min: 0,
  },
  spent: {
    type: Number,
    default: 0,
    min: 0,
  },
  remaining: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: "USD",
    enum: ["USD", "EUR", "GBP", "CAD"],
  },
  expenses: [projectExpenseSchema],
});

// Project milestone schema
const projectMilestoneSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString(),
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  dueDate: {
    type: Date,
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  completedAt: Date,
  dependencies: [String],
  assignedTo: [String],
});

// Project timeline schema
const projectTimelineSchema = new mongoose.Schema({
  startDate: {
    type: Date,
    required: true,
  },
  endDate: Date,
  milestones: [projectMilestoneSchema],
  estimatedDuration: Number, // in days
});

// Project member schema
const projectMemberSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    ref: "User",
  },
  role: {
    type: String,
    required: true,
    enum: ["owner", "manager", "photographer", "editor", "writer", "viewer"],
  },
  permissions: [
    {
      type: String,
      enum: [
        "read",
        "write",
        "delete",
        "manage_team",
        "manage_budget",
        "manage_timeline",
      ],
    },
  ],
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  hourlyRate: Number,
  hoursLogged: {
    type: Number,
    default: 0,
  },
});

// Project asset schema
const projectAssetSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString(),
  },
  type: {
    type: String,
    required: true,
    enum: ["gallery", "image", "deliverable", "document"],
  },
  referenceId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  url: String,
  addedAt: {
    type: Date,
    default: Date.now,
  },
  addedBy: {
    type: String,
    required: true,
    ref: "User",
  },
});

// Project deliverable schema
const projectDeliverableSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString(),
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  type: {
    type: String,
    required: true,
    enum: ["document", "video", "image", "presentation", "other"],
    default: "document",
  },
  status: {
    type: String,
    required: true,
    enum: ["pending", "in_progress", "review", "completed", "rejected"],
    default: "pending",
  },
  dueDate: {
    type: Date,
    required: true,
  },
  assignedTo: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: Date,
});

// Main project schema
const projectSchema = new mongoose.Schema<
  IProjectDocument,
  ProjectModel,
  IProjectMethods
>(
  {
    title: {
      type: String,
      required: [true, "Project title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Project description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    type: {
      type: String,
      required: true,
      enum: ["bring_a_trailer", "documentation", "media_campaign", "custom"],
    },
    status: {
      type: String,
      required: true,
      enum: ["draft", "active", "in_review", "completed", "archived"],
      default: "draft",
    },
    priority: {
      type: String,
      required: true,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    // Relationships
    clientId: {
      type: String,
      ref: "Client",
    },
    carIds: [
      {
        type: String,
        ref: "Car",
      },
    ],
    galleryIds: [
      {
        type: String,
        ref: "Gallery",
      },
    ],
    deliverableIds: [
      {
        type: String,
        ref: "Deliverable",
      },
    ],
    eventIds: [
      {
        type: String,
        ref: "Event",
      },
    ],

    // Team and permissions
    members: [projectMemberSchema],
    ownerId: {
      type: String,
      required: true,
      ref: "User",
    },

    // Timeline and milestones
    timeline: {
      type: projectTimelineSchema,
      required: true,
    },

    // Budget tracking
    budget: projectBudgetSchema,

    // Assets and deliverables
    assets: [projectAssetSchema],

    // Embedded deliverables
    deliverables: [projectDeliverableSchema],

    // Progress tracking
    progress: {
      percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      completedTasks: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalTasks: {
        type: Number,
        default: 0,
        min: 0,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },

    // Metadata
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    notes: String,
    templateId: {
      type: String,
      ref: "ProjectTemplate",
    },

    // Timestamps
    completedAt: Date,
    archivedAt: Date,
  },
  {
    collection: "projects",
    timestamps: true,
  }
);

// Indexes for performance
projectSchema.index({ status: 1, priority: 1 });
projectSchema.index({ ownerId: 1 });
projectSchema.index({ "members.userId": 1 });
projectSchema.index({ clientId: 1 });
projectSchema.index({ carIds: 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ "timeline.startDate": 1, "timeline.endDate": 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ title: "text", description: "text" });

// Instance methods
projectSchema.methods.addMember = async function (
  userId: string,
  role: ProjectMemberRole
) {
  // Check if user is already a member
  const existingMember = this.members.find(
    (member: ProjectMember) => member.userId === userId
  );
  if (existingMember) {
    throw new Error("User is already a member of this project");
  }

  // Define default permissions based on role
  const defaultPermissions: Record<ProjectMemberRole, string[]> = {
    owner: [
      "read",
      "write",
      "delete",
      "manage_team",
      "manage_budget",
      "manage_timeline",
    ],
    manager: ["read", "write", "manage_team", "manage_timeline"],
    photographer: ["read", "write"],
    editor: ["read", "write"],
    writer: ["read", "write"],
    viewer: ["read"],
  };

  this.members.push({
    userId,
    role,
    permissions: defaultPermissions[role],
    joinedAt: new Date(),
  });

  await this.save();
};

projectSchema.methods.removeMember = async function (userId: string) {
  this.members = this.members.filter(
    (member: ProjectMember) => member.userId !== userId
  );
  await this.save();
};

projectSchema.methods.updateProgress = async function () {
  const completedMilestones = this.timeline.milestones.filter(
    (milestone: ProjectMilestone) => milestone.completed
  ).length;
  const totalMilestones = this.timeline.milestones.length;

  this.progress.completedTasks = completedMilestones;
  this.progress.totalTasks = totalMilestones;
  this.progress.percentage =
    totalMilestones > 0
      ? Math.round((completedMilestones / totalMilestones) * 100)
      : 0;
  this.progress.lastUpdated = new Date();

  await this.save();
};

projectSchema.methods.addAsset = async function (
  asset: Omit<ProjectAsset, "id" | "addedAt">
) {
  this.assets.push({
    ...asset,
    id: new mongoose.Types.ObjectId().toString(),
    addedAt: new Date(),
  });
  await this.save();
};

projectSchema.methods.addMilestone = async function (
  milestone: Omit<ProjectMilestone, "id">
) {
  this.timeline.milestones.push({
    ...milestone,
    id: new mongoose.Types.ObjectId().toString(),
  });
  await this.updateProgress();
};

projectSchema.methods.completeMilestone = async function (milestoneId: string) {
  const milestone = this.timeline.milestones.find(
    (m: ProjectMilestone) => m.id === milestoneId
  );
  if (milestone) {
    milestone.completed = true;
    milestone.completedAt = new Date();
    await this.updateProgress();
  }
};

// Pre-save middleware
projectSchema.pre("save", function (next) {
  // Update budget remaining amount
  if (this.budget) {
    this.budget.remaining = this.budget.total - this.budget.spent;
  }

  // Set completion date when status changes to completed
  if (this.status === "completed" && !this.completedAt) {
    this.completedAt = new Date();
  }

  // Set archived date when status changes to archived
  if (this.status === "archived" && !this.archivedAt) {
    this.archivedAt = new Date();
  }

  next();
});

// Create and export the Project model
export const Project = (mongoose.models.Project ||
  mongoose.model<IProjectDocument, ProjectModel>(
    "Project",
    projectSchema
  )) as ProjectModel;

export default Project;
