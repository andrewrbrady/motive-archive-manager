import { ProjectTemplate, ProjectType } from "@/types/project";

export const defaultProjectTemplates: Omit<
  ProjectTemplate,
  "_id" | "createdBy" | "createdAt" | "updatedAt"
>[] = [
  {
    name: "Bring a Trailer Listing",
    description:
      "Complete workflow for preparing and listing a vehicle on Bring a Trailer auction platform",
    type: "bring_a_trailer" as ProjectType,
    defaultTimeline: {
      milestones: [
        {
          id: "1",
          title: "Initial Vehicle Assessment",
          description:
            "Comprehensive evaluation of vehicle condition, documentation, and market research",
          dueDate: new Date(), // Will be calculated based on start date
          completed: false,
          dependencies: [],
          assignedTo: [],
        },
        {
          id: "2",
          title: "Photography Session",
          description:
            "Professional photography of exterior, interior, engine bay, and detail shots",
          dueDate: new Date(),
          completed: false,
          dependencies: ["1"],
          assignedTo: [],
        },
        {
          id: "3",
          title: "Documentation Gathering",
          description:
            "Collect service records, title, registration, and any relevant documentation",
          dueDate: new Date(),
          completed: false,
          dependencies: ["1"],
          assignedTo: [],
        },
        {
          id: "4",
          title: "Listing Copy Creation",
          description:
            "Write compelling auction description highlighting key features and history",
          dueDate: new Date(),
          completed: false,
          dependencies: ["2", "3"],
          assignedTo: [],
        },
        {
          id: "5",
          title: "BAT Submission Review",
          description:
            "Final review and submission to Bring a Trailer for approval",
          dueDate: new Date(),
          completed: false,
          dependencies: ["4"],
          assignedTo: [],
        },
        {
          id: "6",
          title: "Auction Management",
          description:
            "Monitor auction, respond to questions, and manage bidding process",
          dueDate: new Date(),
          completed: false,
          dependencies: ["5"],
          assignedTo: [],
        },
      ],
      estimatedDuration: 21, // 3 weeks
    },
    defaultBudget: {
      total: 2500,
      spent: 0,
      remaining: 2500,
      currency: "USD",
      expenses: [],
    },
    requiredRoles: ["owner", "photographer", "writer"],
    defaultTasks: [
      "Schedule vehicle inspection",
      "Book photography session",
      "Research comparable sales",
      "Gather maintenance records",
      "Write auction description",
      "Submit to BAT",
      "Monitor auction activity",
    ],
    isPublic: true,
  },
  {
    name: "Vehicle Documentation Project",
    description:
      "Comprehensive documentation project for preserving vehicle history and specifications",
    type: "documentation" as ProjectType,
    defaultTimeline: {
      milestones: [
        {
          id: "1",
          title: "Research & Planning",
          description:
            "Research vehicle history, specifications, and plan documentation scope",
          dueDate: new Date(),
          completed: false,
          dependencies: [],
          assignedTo: [],
        },
        {
          id: "2",
          title: "Photography & Videography",
          description:
            "Capture detailed photos and videos of all vehicle aspects",
          dueDate: new Date(),
          completed: false,
          dependencies: ["1"],
          assignedTo: [],
        },
        {
          id: "3",
          title: "Technical Documentation",
          description:
            "Document specifications, modifications, and technical details",
          dueDate: new Date(),
          completed: false,
          dependencies: ["1"],
          assignedTo: [],
        },
        {
          id: "4",
          title: "Content Creation",
          description:
            "Create written content, captions, and organize media assets",
          dueDate: new Date(),
          completed: false,
          dependencies: ["2", "3"],
          assignedTo: [],
        },
        {
          id: "5",
          title: "Final Assembly",
          description:
            "Compile all documentation into final deliverable format",
          dueDate: new Date(),
          completed: false,
          dependencies: ["4"],
          assignedTo: [],
        },
      ],
      estimatedDuration: 14, // 2 weeks
    },
    defaultBudget: {
      total: 1500,
      spent: 0,
      remaining: 1500,
      currency: "USD",
      expenses: [],
    },
    requiredRoles: ["owner", "photographer", "writer", "editor"],
    defaultTasks: [
      "Research vehicle background",
      "Plan photo shoot",
      "Capture detail photography",
      "Record video walkaround",
      "Document specifications",
      "Write descriptions",
      "Edit and organize content",
      "Create final deliverable",
    ],
    isPublic: true,
  },
  {
    name: "Media Campaign",
    description:
      "Multi-platform media campaign for vehicle promotion or brand awareness",
    type: "media_campaign" as ProjectType,
    defaultTimeline: {
      milestones: [
        {
          id: "1",
          title: "Campaign Strategy",
          description:
            "Define campaign goals, target audience, and platform strategy",
          dueDate: new Date(),
          completed: false,
          dependencies: [],
          assignedTo: [],
        },
        {
          id: "2",
          title: "Content Planning",
          description: "Plan content calendar and asset requirements",
          dueDate: new Date(),
          completed: false,
          dependencies: ["1"],
          assignedTo: [],
        },
        {
          id: "3",
          title: "Asset Creation",
          description: "Create photos, videos, graphics, and written content",
          dueDate: new Date(),
          completed: false,
          dependencies: ["2"],
          assignedTo: [],
        },
        {
          id: "4",
          title: "Campaign Launch",
          description: "Deploy content across planned platforms and channels",
          dueDate: new Date(),
          completed: false,
          dependencies: ["3"],
          assignedTo: [],
        },
        {
          id: "5",
          title: "Performance Monitoring",
          description:
            "Track engagement, reach, and campaign performance metrics",
          dueDate: new Date(),
          completed: false,
          dependencies: ["4"],
          assignedTo: [],
        },
        {
          id: "6",
          title: "Campaign Analysis",
          description: "Analyze results and compile performance report",
          dueDate: new Date(),
          completed: false,
          dependencies: ["5"],
          assignedTo: [],
        },
      ],
      estimatedDuration: 30, // 1 month
    },
    defaultBudget: {
      total: 5000,
      spent: 0,
      remaining: 5000,
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
      "Compile analytics report",
    ],
    isPublic: true,
  },
  {
    name: "Custom Project",
    description: "Flexible template for custom project requirements",
    type: "custom" as ProjectType,
    defaultTimeline: {
      milestones: [
        {
          id: "1",
          title: "Project Kickoff",
          description: "Define project scope, requirements, and timeline",
          dueDate: new Date(),
          completed: false,
          dependencies: [],
          assignedTo: [],
        },
        {
          id: "2",
          title: "Planning Phase",
          description: "Detailed planning and resource allocation",
          dueDate: new Date(),
          completed: false,
          dependencies: ["1"],
          assignedTo: [],
        },
        {
          id: "3",
          title: "Execution Phase",
          description: "Main project work and deliverable creation",
          dueDate: new Date(),
          completed: false,
          dependencies: ["2"],
          assignedTo: [],
        },
        {
          id: "4",
          title: "Review & Refinement",
          description: "Review work and make necessary adjustments",
          dueDate: new Date(),
          completed: false,
          dependencies: ["3"],
          assignedTo: [],
        },
        {
          id: "5",
          title: "Project Completion",
          description: "Final deliverable and project closure",
          dueDate: new Date(),
          completed: false,
          dependencies: ["4"],
          assignedTo: [],
        },
      ],
      estimatedDuration: 21, // 3 weeks
    },
    requiredRoles: ["owner"],
    defaultTasks: [
      "Define project scope",
      "Allocate resources",
      "Execute planned work",
      "Review deliverables",
      "Complete project",
    ],
    isPublic: true,
  },
];
