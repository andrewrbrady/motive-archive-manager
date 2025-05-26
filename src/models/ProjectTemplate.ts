import mongoose, { Document, Model } from "mongoose";
import {
  ProjectTemplate as IProjectTemplate,
  ProjectType,
  ProjectMemberRole,
} from "@/types/project";

// ProjectTemplate document interface
export interface IProjectTemplateDocument
  extends Document,
    Omit<IProjectTemplate, "_id"> {}

// ProjectTemplate methods interface
export interface IProjectTemplateMethods {
  createProject(data: {
    title: string;
    description: string;
    ownerId: string;
    startDate: Date;
  }): Promise<any>;
}

// ProjectTemplate model type
export type ProjectTemplateModel = Model<
  IProjectTemplateDocument,
  Record<string, never>,
  IProjectTemplateMethods
>;

// Default milestone schema for templates
const defaultMilestoneSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  daysFromStart: {
    type: Number,
    required: true,
    min: 0,
  },
  dependencies: [String],
});

// Default timeline schema for templates
const defaultTimelineSchema = new mongoose.Schema({
  milestones: [defaultMilestoneSchema],
  estimatedDuration: {
    type: Number,
    required: true,
    min: 1,
  },
});

// Default budget schema for templates
const defaultBudgetSchema = new mongoose.Schema({
  total: Number,
  currency: {
    type: String,
    default: "USD",
    enum: ["USD", "EUR", "GBP", "CAD"],
  },
  categories: [
    {
      name: String,
      estimatedAmount: Number,
      description: String,
    },
  ],
});

// Main project template schema
const projectTemplateSchema = new mongoose.Schema<
  IProjectTemplateDocument,
  ProjectTemplateModel,
  IProjectTemplateMethods
>(
  {
    name: {
      type: String,
      required: [true, "Template name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Template description is required"],
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    type: {
      type: String,
      required: true,
      enum: ["bring_a_trailer", "documentation", "media_campaign", "custom"],
    },
    defaultTimeline: {
      type: defaultTimelineSchema,
      required: true,
    },
    defaultBudget: defaultBudgetSchema,
    requiredRoles: [
      {
        type: String,
        enum: [
          "owner",
          "manager",
          "photographer",
          "editor",
          "writer",
          "viewer",
        ],
      },
    ],
    defaultTasks: [
      {
        type: String,
        trim: true,
      },
    ],
    isPublic: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: String,
      required: true,
      ref: "User",
    },
  },
  {
    collection: "project_templates",
    timestamps: true,
  }
);

// Indexes for performance
projectTemplateSchema.index({ type: 1 });
projectTemplateSchema.index({ isPublic: 1 });
projectTemplateSchema.index({ createdBy: 1 });
projectTemplateSchema.index({ name: "text", description: "text" });

// Instance methods
projectTemplateSchema.methods.createProject = async function (data: {
  title: string;
  description: string;
  ownerId: string;
  startDate: Date;
}) {
  const Project = mongoose.model("Project");

  // Calculate milestone dates based on template
  const milestones = this.defaultTimeline.milestones.map((milestone: any) => ({
    title: milestone.title,
    description: milestone.description,
    dueDate: new Date(
      data.startDate.getTime() + milestone.daysFromStart * 24 * 60 * 60 * 1000
    ),
    completed: false,
    dependencies: milestone.dependencies || [],
    assignedTo: [],
  }));

  // Calculate end date - add type guard
  const estimatedDuration = this.defaultTimeline.estimatedDuration || 30; // default to 30 days
  const endDate = new Date(
    data.startDate.getTime() + estimatedDuration * 24 * 60 * 60 * 1000
  );

  const projectData = {
    title: data.title,
    description: data.description,
    type: this.type,
    status: "draft",
    priority: "medium",
    ownerId: data.ownerId,
    templateId: (this._id as mongoose.Types.ObjectId).toString(),
    timeline: {
      startDate: data.startDate,
      endDate: endDate,
      milestones: milestones,
      estimatedDuration: estimatedDuration,
    },
    members: [
      {
        userId: data.ownerId,
        role: "owner",
        permissions: [
          "read",
          "write",
          "delete",
          "manage_team",
          "manage_budget",
          "manage_timeline",
        ],
        joinedAt: new Date(),
      },
    ],
    carIds: [],
    galleryIds: [],
    deliverableIds: [],
    eventIds: [],
    assets: [],
    progress: {
      percentage: 0,
      completedTasks: 0,
      totalTasks: milestones.length,
      lastUpdated: new Date(),
    },
    tags: [],
    budget: this.defaultBudget
      ? {
          total: this.defaultBudget.total || 0,
          spent: 0,
          remaining: this.defaultBudget.total || 0,
          currency: this.defaultBudget.currency || "USD",
          expenses: [],
        }
      : undefined,
  };

  return await Project.create(projectData);
};

// Create and export the ProjectTemplate model
export const ProjectTemplate = (mongoose.models.ProjectTemplate ||
  mongoose.model<IProjectTemplateDocument, ProjectTemplateModel>(
    "ProjectTemplate",
    projectTemplateSchema
  )) as ProjectTemplateModel;

export default ProjectTemplate;
