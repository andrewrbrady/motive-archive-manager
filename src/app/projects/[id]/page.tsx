import React from "react";
import { notFound } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { getMongoClient } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { Project } from "@/types/project";
import { ProjectClientWrapper } from "./ProjectClientWrapper";

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    tab?: string;
  }>;
}

async function getProject(id: string) {
  try {
    // Validate ObjectId format before using it
    if (!ObjectId.isValid(id)) {
      console.error(`Invalid ObjectId format: ${id}`);
      return null;
    }

    const mongoClient = await getMongoClient();
    const db = mongoClient.db(process.env.MONGODB_DB || "motive_archive");
    const projectsCollection = db.collection("projects");

    const project = await projectsCollection.findOne({ _id: new ObjectId(id) });

    if (!project) {
      return null;
    }

    // Properly serialize all MongoDB objects to plain objects
    const serializedProject = {
      _id: project._id.toString(),
      title: project.title || "",
      description: project.description || "",
      type: project.type || "documentation",
      status: project.status || "draft",

      // Relationships - stored as ObjectIds in DB, converted to strings for frontend
      clientId: project.clientId ? project.clientId.toString() : undefined,
      carIds: (project.carIds || []).map((id: any) =>
        typeof id === "string" ? id : id.toString()
      ),
      galleryIds: (project.galleryIds || []).map((id: any) =>
        typeof id === "string" ? id : id.toString()
      ),
      deliverableIds: (project.deliverableIds || []).map((id: any) =>
        typeof id === "string" ? id : id.toString()
      ),
      eventIds: (project.eventIds || []).map((id: any) =>
        typeof id === "string" ? id : id.toString()
      ),

      // Team and permissions - serialize member objects
      members: (project.members || []).map((member: any) => ({
        userId: member.userId || "",
        role: member.role || "viewer",
        permissions: member.permissions || [],
        joinedAt:
          member.joinedAt instanceof Date
            ? member.joinedAt.toISOString()
            : typeof member.joinedAt === "string"
              ? member.joinedAt
              : new Date(member.joinedAt).toISOString(),
        hourlyRate: member.hourlyRate || undefined,
        hoursLogged: member.hoursLogged || undefined,
        // Remove any _id fields that might exist on member objects
      })),
      ownerId: project.ownerId || "",

      // Timeline and milestones - serialize dates
      timeline: project.timeline
        ? {
            ...project.timeline,
            _id: project.timeline._id
              ? project.timeline._id.toString()
              : undefined,
            startDate:
              project.timeline.startDate instanceof Date
                ? project.timeline.startDate.toISOString()
                : typeof project.timeline.startDate === "string"
                  ? project.timeline.startDate
                  : new Date(project.timeline.startDate).toISOString(),
            endDate: project.timeline.endDate
              ? project.timeline.endDate instanceof Date
                ? project.timeline.endDate.toISOString()
                : typeof project.timeline.endDate === "string"
                  ? project.timeline.endDate
                  : new Date(project.timeline.endDate).toISOString()
              : undefined,
            milestones: (project.timeline.milestones || []).map(
              (milestone: any) => ({
                ...milestone,
                _id: milestone._id
                  ? milestone._id.toString()
                  : milestone.id || undefined,
                dueDate:
                  milestone.dueDate instanceof Date
                    ? milestone.dueDate.toISOString()
                    : typeof milestone.dueDate === "string"
                      ? milestone.dueDate
                      : new Date(milestone.dueDate).toISOString(),
                completedAt: milestone.completedAt
                  ? milestone.completedAt instanceof Date
                    ? milestone.completedAt.toISOString()
                    : typeof milestone.completedAt === "string"
                      ? milestone.completedAt
                      : new Date(milestone.completedAt).toISOString()
                  : undefined,
              })
            ),
          }
        : {
            startDate: new Date().toISOString(),
            milestones: [],
          },

      // Budget tracking
      budget: project.budget
        ? {
            ...project.budget,
            _id: project.budget._id ? project.budget._id.toString() : undefined,
            expenses: (project.budget.expenses || []).map((expense: any) => ({
              ...expense,
              _id: expense._id
                ? expense._id.toString()
                : expense.id || undefined,
              date:
                expense.date instanceof Date
                  ? expense.date.toISOString()
                  : typeof expense.date === "string"
                    ? expense.date
                    : new Date(expense.date).toISOString(),
            })),
          }
        : undefined,

      // Assets and deliverables - serialize dates
      assets: (project.assets || []).map((asset: any) => ({
        ...asset,
        _id: asset._id ? asset._id.toString() : asset.id || undefined,
        addedAt:
          asset.addedAt instanceof Date
            ? asset.addedAt.toISOString()
            : typeof asset.addedAt === "string"
              ? asset.addedAt
              : new Date(asset.addedAt).toISOString(),
      })),

      // Embedded deliverables - serialize dates
      deliverables: (project.deliverables || []).map((deliverable: any) => ({
        ...deliverable,
        _id: deliverable._id
          ? deliverable._id.toString()
          : deliverable.id || undefined,
        dueDate:
          deliverable.dueDate instanceof Date
            ? deliverable.dueDate.toISOString()
            : typeof deliverable.dueDate === "string"
              ? deliverable.dueDate
              : new Date(deliverable.dueDate).toISOString(),
        createdAt:
          deliverable.createdAt instanceof Date
            ? deliverable.createdAt.toISOString()
            : typeof deliverable.createdAt === "string"
              ? deliverable.createdAt
              : new Date(deliverable.createdAt).toISOString(),
        updatedAt:
          deliverable.updatedAt instanceof Date
            ? deliverable.updatedAt.toISOString()
            : typeof deliverable.updatedAt === "string"
              ? deliverable.updatedAt
              : new Date(deliverable.updatedAt).toISOString(),
        completedAt: deliverable.completedAt
          ? deliverable.completedAt instanceof Date
            ? deliverable.completedAt.toISOString()
            : typeof deliverable.completedAt === "string"
              ? deliverable.completedAt
              : new Date(deliverable.completedAt).toISOString()
          : undefined,
      })),

      // Progress tracking - serialize date
      progress: project.progress
        ? {
            ...project.progress,
            _id: project.progress._id
              ? project.progress._id.toString()
              : undefined,
            lastUpdated:
              project.progress.lastUpdated instanceof Date
                ? project.progress.lastUpdated.toISOString()
                : typeof project.progress.lastUpdated === "string"
                  ? project.progress.lastUpdated
                  : new Date(project.progress.lastUpdated).toISOString(),
          }
        : {
            percentage: 0,
            completedTasks: 0,
            totalTasks: 0,
            lastUpdated: new Date().toISOString(),
          },

      // Metadata
      tags: project.tags || [],
      notes: project.notes || undefined,
      primaryImageId: project.primaryImageId
        ? project.primaryImageId.toString()
        : undefined,
      primaryImageUrl: project.primaryImageUrl || undefined,
      templateId: project.templateId
        ? project.templateId.toString()
        : undefined,

      // Convert dates to ISO strings - handle both Date objects and existing strings
      createdAt: project.createdAt
        ? project.createdAt instanceof Date
          ? project.createdAt.toISOString()
          : typeof project.createdAt === "string"
            ? project.createdAt
            : new Date(project.createdAt).toISOString()
        : new Date().toISOString(),
      updatedAt: project.updatedAt
        ? project.updatedAt instanceof Date
          ? project.updatedAt.toISOString()
          : typeof project.updatedAt === "string"
            ? project.updatedAt
            : new Date(project.updatedAt).toISOString()
        : new Date().toISOString(),
      completedAt: project.completedAt
        ? project.completedAt instanceof Date
          ? project.completedAt.toISOString()
          : typeof project.completedAt === "string"
            ? project.completedAt
            : new Date(project.completedAt).toISOString()
        : undefined,
      archivedAt: project.archivedAt
        ? project.archivedAt instanceof Date
          ? project.archivedAt.toISOString()
          : typeof project.archivedAt === "string"
            ? project.archivedAt
            : new Date(project.archivedAt).toISOString()
        : undefined,
    };

    return serializedProject as any as Project;
  } catch (error) {
    console.error("Error fetching project:", error);
    return null;
  }
  // DO NOT close the connection - getMongoClient() returns a shared connection
}

export default async function ProjectPage({
  params,
  searchParams,
}: ProjectPageProps) {
  const { id } = await params;
  const { tab } = await searchParams;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  // Determine initial tab from searchParams for SSR optimization
  let initialTab = "overview";
  if (tab) {
    // Migration: redirect old "captions" tab to new "copywriter" tab
    if (tab === "captions") {
      initialTab = "copywriter";
    } else if (
      [
        "overview",
        "timeline",
        "events",
        "team",
        "cars",
        "images",
        "galleries",
        "assets",
        "deliverables",
        "copywriter",
        "content-studio",
        "ai-chat",
        "calendar",
      ].includes(tab)
    ) {
      initialTab = tab;
    }
  }

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-background">
        <div className="container-wide px-6 py-8">
          <ProjectClientWrapper project={project} initialTab={initialTab} />
        </div>
      </div>
    </AuthGuard>
  );
}
