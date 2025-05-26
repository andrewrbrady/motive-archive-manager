import { ProjectTemplate, ProjectType } from "@/types/project";

export const defaultProjectTemplates: Omit<
  ProjectTemplate,
  "_id" | "createdBy" | "createdAt" | "updatedAt"
>[] = [
  {
    name: "Multi-Vehicle Documentation Campaign",
    description:
      "Comprehensive documentation project for multiple vehicles, creating detailed portfolios and media assets",
    type: "documentation" as ProjectType,
    defaultTimeline: {
      milestones: [
        {
          id: "1",
          title: "Campaign Planning & Research",
          description:
            "Define scope, research vehicle histories, plan photography sessions and content strategy",
          dueDate: new Date(),
          completed: false,
          dependencies: [],
          assignedTo: [],
        },
        {
          id: "2",
          title: "Photography & Videography Sessions",
          description:
            "Conduct professional photo and video shoots for all vehicles in the campaign",
          dueDate: new Date(),
          completed: false,
          dependencies: ["1"],
          assignedTo: [],
        },
        {
          id: "3",
          title: "Content Creation & Editing",
          description:
            "Edit photos/videos, create written content, and develop supporting materials",
          dueDate: new Date(),
          completed: false,
          dependencies: ["2"],
          assignedTo: [],
        },
        {
          id: "4",
          title: "Portfolio Assembly",
          description:
            "Compile all assets into cohesive portfolios and deliverable formats",
          dueDate: new Date(),
          completed: false,
          dependencies: ["3"],
          assignedTo: [],
        },
        {
          id: "5",
          title: "Client Review & Revisions",
          description:
            "Present work to client, gather feedback, and implement revisions",
          dueDate: new Date(),
          completed: false,
          dependencies: ["4"],
          assignedTo: [],
        },
      ],
      estimatedDuration: 21, // 3 weeks
    },
    defaultBudget: {
      total: 3500,
      spent: 0,
      remaining: 3500,
      currency: "USD",
      expenses: [],
    },
    requiredRoles: ["owner", "photographer", "writer", "editor"],
    defaultTasks: [
      "Define project scope and objectives",
      "Research vehicle backgrounds",
      "Schedule photography sessions",
      "Capture detail photography",
      "Record video content",
      "Write vehicle descriptions",
      "Edit and organize content",
      "Create final deliverables",
      "Present to client",
    ],
    isPublic: true,
  },
  {
    name: "Brand Marketing Campaign",
    description:
      "Multi-platform marketing campaign for automotive brands, dealerships, or collections",
    type: "media_campaign" as ProjectType,
    defaultTimeline: {
      milestones: [
        {
          id: "1",
          title: "Campaign Strategy & Planning",
          description:
            "Define campaign goals, target audience, platform strategy, and content calendar",
          dueDate: new Date(),
          completed: false,
          dependencies: [],
          assignedTo: [],
        },
        {
          id: "2",
          title: "Asset Production",
          description:
            "Create photos, videos, graphics, and written content for the campaign",
          dueDate: new Date(),
          completed: false,
          dependencies: ["1"],
          assignedTo: [],
        },
        {
          id: "3",
          title: "Content Scheduling & Launch",
          description:
            "Schedule content across platforms and launch the campaign",
          dueDate: new Date(),
          completed: false,
          dependencies: ["2"],
          assignedTo: [],
        },
        {
          id: "4",
          title: "Campaign Management",
          description:
            "Monitor performance, engage with audience, and optimize content",
          dueDate: new Date(),
          completed: false,
          dependencies: ["3"],
          assignedTo: [],
        },
        {
          id: "5",
          title: "Performance Analysis",
          description:
            "Analyze campaign metrics and compile performance report",
          dueDate: new Date(),
          completed: false,
          dependencies: ["4"],
          assignedTo: [],
        },
        {
          id: "6",
          title: "Campaign Wrap-up",
          description: "Final reporting, asset delivery, and campaign closure",
          dueDate: new Date(),
          completed: false,
          dependencies: ["5"],
          assignedTo: [],
        },
      ],
      estimatedDuration: 45, // 6-7 weeks
    },
    defaultBudget: {
      total: 8000,
      spent: 0,
      remaining: 8000,
      currency: "USD",
      expenses: [],
    },
    requiredRoles: ["owner", "manager", "photographer", "editor", "writer"],
    defaultTasks: [
      "Define campaign objectives",
      "Research target audience",
      "Create content calendar",
      "Shoot campaign assets",
      "Edit photos and videos",
      "Write copy and captions",
      "Schedule social posts",
      "Monitor performance",
      "Engage with audience",
      "Compile analytics report",
    ],
    isPublic: true,
  },
  {
    name: "Event Coverage Campaign",
    description:
      "Comprehensive coverage of automotive events, shows, or launches with multi-format deliverables",
    type: "event_coverage" as ProjectType,
    defaultTimeline: {
      milestones: [
        {
          id: "1",
          title: "Pre-Event Planning",
          description:
            "Coordinate with event organizers, plan coverage strategy, and prepare equipment",
          dueDate: new Date(),
          completed: false,
          dependencies: [],
          assignedTo: [],
        },
        {
          id: "2",
          title: "Event Coverage",
          description:
            "On-site photography, videography, and content creation during the event",
          dueDate: new Date(),
          completed: false,
          dependencies: ["1"],
          assignedTo: [],
        },
        {
          id: "3",
          title: "Rapid Content Processing",
          description:
            "Quick editing and processing for immediate social media and press releases",
          dueDate: new Date(),
          completed: false,
          dependencies: ["2"],
          assignedTo: [],
        },
        {
          id: "4",
          title: "Comprehensive Post-Production",
          description:
            "Detailed editing, color correction, and creation of final deliverables",
          dueDate: new Date(),
          completed: false,
          dependencies: ["3"],
          assignedTo: [],
        },
        {
          id: "5",
          title: "Content Distribution",
          description:
            "Distribute content across platforms and deliver final assets to client",
          dueDate: new Date(),
          completed: false,
          dependencies: ["4"],
          assignedTo: [],
        },
      ],
      estimatedDuration: 14, // 2 weeks
    },
    defaultBudget: {
      total: 4500,
      spent: 0,
      remaining: 4500,
      currency: "USD",
      expenses: [],
    },
    requiredRoles: ["owner", "photographer", "editor", "writer"],
    defaultTasks: [
      "Coordinate with event organizers",
      "Plan coverage strategy",
      "Prepare equipment and crew",
      "Capture event photography",
      "Record video content",
      "Create real-time social content",
      "Edit and process media",
      "Write event coverage",
      "Distribute final content",
    ],
    isPublic: true,
  },
  {
    name: "Custom Campaign",
    description:
      "Flexible template for custom campaign requirements and specialized projects",
    type: "custom" as ProjectType,
    defaultTimeline: {
      milestones: [
        {
          id: "1",
          title: "Project Discovery & Planning",
          description:
            "Define project scope, requirements, timeline, and resource allocation",
          dueDate: new Date(),
          completed: false,
          dependencies: [],
          assignedTo: [],
        },
        {
          id: "2",
          title: "Creative Development",
          description:
            "Develop creative concepts, strategies, and production plans",
          dueDate: new Date(),
          completed: false,
          dependencies: ["1"],
          assignedTo: [],
        },
        {
          id: "3",
          title: "Production Phase",
          description:
            "Execute main production work including content creation and asset development",
          dueDate: new Date(),
          completed: false,
          dependencies: ["2"],
          assignedTo: [],
        },
        {
          id: "4",
          title: "Review & Refinement",
          description:
            "Client review, feedback incorporation, and quality refinement",
          dueDate: new Date(),
          completed: false,
          dependencies: ["3"],
          assignedTo: [],
        },
        {
          id: "5",
          title: "Final Delivery",
          description: "Final deliverable preparation and project completion",
          dueDate: new Date(),
          completed: false,
          dependencies: ["4"],
          assignedTo: [],
        },
      ],
      estimatedDuration: 30, // 4-5 weeks
    },
    requiredRoles: ["owner"],
    defaultTasks: [
      "Define project scope",
      "Develop creative strategy",
      "Allocate resources",
      "Execute production work",
      "Review deliverables",
      "Complete project",
    ],
    isPublic: true,
  },
];
