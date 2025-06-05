import React from "react";
import { notFound } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import { ProjectTabs } from "@/components/projects/ProjectTabs";
import { getMongoClient } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getProject(id: string) {
  try {
    const mongoClient = await getMongoClient();
    const db = mongoClient.db(process.env.MONGODB_DB || "motive_archive");
    const projectsCollection = db.collection("projects");

    const project = await projectsCollection.findOne({ _id: new ObjectId(id) });

    if (!project) {
      return null;
    }

    // Helper function to serialize dates
    const serializeDate = (date: any) => {
      if (!date) return null;
      if (date instanceof Date) return date.toISOString();
      if (typeof date === "string") return date;
      return new Date(date).toISOString();
    };

    // Helper function to serialize ObjectIds
    const serializeObjectId = (id: any) => {
      if (!id) return null;
      return typeof id === "string" ? id : id.toString();
    };

    // Helper function to serialize ObjectId arrays
    const serializeObjectIdArray = (arr: any[]) => {
      if (!Array.isArray(arr)) return [];
      return arr.map((id) => serializeObjectId(id));
    };

    // Properly serialize all MongoDB objects to plain objects
    const serializedProject = {
      _id: project._id.toString(),
      title: project.title || "",
      description: project.description || "",
      type: project.type || "documentation",
      status: project.status || "draft",
      
      // Relationships - convert ObjectIds to strings
      clientId: serializeObjectId(project.clientId),
      carIds: serializeObjectIdArray(project.carIds || []),
      galleryIds: serializeObjectIdArray(project.galleryIds || []),
      deliverableIds: serializeObjectIdArray(project.deliverableIds || []),
      eventIds: serializeObjectIdArray(project.eventIds || []),
      
      // Team and permissions
      members: (project.members || []).map((member: any) => ({
        userId: member.userId || "",
        role: member.role || "viewer",
        permissions: member.permissions || [],
        joinedAt: serializeDate(member.joinedAt),
        hourlyRate: member.hourlyRate || null,
        hoursLogged: member.hoursLogged || null,
      })),
      ownerId: project.ownerId || "",
      
      // Timeline and milestones
      timeline: {
        startDate: serializeDate(project.timeline?.startDate),
        endDate: serializeDate(project.timeline?.endDate),
        milestones: (project.timeline?.milestones || []).map((milestone: any) => ({
          id: milestone.id || "",
          title: milestone.title || "",
          description: milestone.description || null,
          dueDate: serializeDate(milestone.dueDate),
          completed: milestone.completed || false,
          completedAt: serializeDate(milestone.completedAt),
          dependencies: milestone.dependencies || [],
          assignedTo: milestone.assignedTo || [],
        })),
        estimatedDuration: project.timeline?.estimatedDuration || null,
      },
      
      // Budget tracking
      budget: project.budget ? {
        total: project.budget.total || 0,
        spent: project.budget.spent || 0,
        remaining: project.budget.remaining || 0,
        currency: project.budget.currency || "USD",
        expenses: (project.budget.expenses || []).map((expense: any) => ({
          id: expense.id || "",
          description: expense.description || "",
          amount: expense.amount || 0,
          category: expense.category || "",
          date: serializeDate(expense.date),
          receipt: expense.receipt || null,
          approvedBy: expense.approvedBy || null,
        })),
      } : null,
      
      // Assets and deliverables
      assets: (project.assets || []).map((asset: any) => ({
        id: asset.id || "",
        type: asset.type || "document",
        referenceId: serializeObjectId(asset.referenceId),
        name: asset.name || "",
        url: asset.url || null,
        addedAt: serializeDate(asset.addedAt),
        addedBy: asset.addedBy || "",
      })),
      
      // Embedded deliverables
      deliverables: (project.deliverables || []).map((deliverable: any) => ({
        id: deliverable.id || "",
        title: deliverable.title || "",
        description: deliverable.description || null,
        type: deliverable.type || "document",
        status: deliverable.status || "pending",
        dueDate: serializeDate(deliverable.dueDate),
        assignedTo: deliverable.assignedTo || null,
        createdAt: serializeDate(deliverable.createdAt),
        updatedAt: serializeDate(deliverable.updatedAt),
        completedAt: serializeDate(deliverable.completedAt),
      })),
      
      // Progress tracking
      progress: {
        percentage: project.progress?.percentage || 0,
        completedTasks: project.progress?.completedTasks || 0,
        totalTasks: project.progress?.totalTasks || 0,
        lastUpdated: serializeDate(project.progress?.lastUpdated),
      },
      
      // Metadata
      tags: project.tags || [],
      notes: project.notes || null,
      primaryImageId: serializeObjectId(project.primaryImageId),
      primaryImageUrl: project.primaryImageUrl || null,
      templateId: serializeObjectId(project.templateId),
      
      // Timestamps
      createdAt: serializeDate(project.createdAt),
      updatedAt: serializeDate(project.updatedAt),
      completedAt: serializeDate(project.completedAt),
      archivedAt: serializeDate(project.archivedAt),
    };

    return serializedProject;
  } catch (error) {
    console.error("Error fetching project:", error);
    return null;
  }
  // DO NOT close the connection - getMongoClient() returns a shared connection
}

async function getMemberDetails(userIds: string[]) {
  if (userIds.length === 0) return {};
  
  try {
    const mongoClient = await getMongoClient();
    const db = mongoClient.db(process.env.MONGODB_DB || "motive_archive");
    const usersCollection = db.collection("users");
    
    const users = await usersCollection.find({ 
      uid: { $in: userIds } 
    }).toArray();
    
    const details: Record<string, { name: string; email: string; image?: string }> = {};
    
    users.forEach((user: any) => {
      if (userIds.includes(user.uid)) {
        details[user.uid] = {
          name: user.name || user.email,
          email: user.email,
          image: user.image,
        };
      }
    });
    
    return details;
  } catch (error) {
    console.error("Error fetching member details:", error);
    return {};
  }
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  // Fetch member details for the project
  const memberUserIds = project.members.map((member) => member.userId);
  const memberDetails = await getMemberDetails(memberUserIds);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <main className="container-wide px-6 py-8">
          <ProjectHeader 
            project={project}
            onStatusChange={() => {}} // This will be handled client-side in the header component
            onBack={() => {}} // This will be handled client-side in the header component
          />

          <div className="mt-8">
            <ProjectTabs
              project={project}
              activeTab="overview" // Default to overview, tabs component will handle URL params
              onTabChange={() => {}} // This will be handled client-side in the tabs component
              memberDetails={memberDetails}
              onProjectUpdate={() => {}} // This will be handled client-side in the tabs component
            />
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
