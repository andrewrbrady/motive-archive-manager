import { ObjectId } from "mongodb";

export interface ChecklistItem {
  id: string;
  description: string;
  completed: boolean;
  dateCompleted?: Date;
}

export interface Inspection {
  _id: ObjectId | string;
  carId: ObjectId | string;
  title: string;
  description?: string;
  status: "pass" | "needs_attention";
  inspectionImageIds: string[];
  dropboxVideoFolderUrl?: string;
  dropboxImageFolderUrl?: string;
  checklistItems: ChecklistItem[];
  inspectedBy?: string;
  inspectedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInspectionRequest {
  title: string;
  description?: string;
  status: "pass" | "needs_attention";
  inspectionImageIds: string[];
  dropboxVideoFolderUrl?: string;
  dropboxImageFolderUrl?: string;
  checklistItems: ChecklistItem[];
  inspectedBy?: string;
}

export interface UpdateInspectionRequest
  extends Partial<CreateInspectionRequest> {
  _id: string;
}

export type InspectionStatus = "pass" | "needs_attention";
