import { ObjectId } from "mongodb";
import {
  APIResponse,
  PaginatedResponse,
  RouteHandler,
  RouteParamsWithId,
} from "../api";

/**
 * Document metadata information
 */
export interface DocumentMetadata {
  /** Original filename */
  filename: string;
  /** MIME type of the document */
  contentType: string;
  /** Size in bytes */
  size: number;
  /** Upload date */
  uploadDate: Date;
  /** Last modified date */
  lastModified?: Date;
  /** Additional metadata fields */
  [key: string]: unknown;
}

/**
 * MongoDB document type
 */
export interface MongoDBDocument {
  _id: ObjectId;
  /** Document title */
  title: string;
  /** Document type (e.g., "invoice", "contract", etc.) */
  type: string;
  /** Reference to the car this document belongs to */
  carId: ObjectId;
  /** Document storage location (e.g., S3 key) */
  location: string;
  /** Document metadata */
  metadata: DocumentMetadata;
  /** Creation timestamp */
  created_at: Date;
  /** Last update timestamp */
  updated_at: Date;
}

/**
 * Standardized document response format
 */
export interface StandardizedDocument {
  _id: string;
  title: string;
  type: string;
  carId: string;
  location: string;
  metadata: Omit<DocumentMetadata, "uploadDate" | "lastModified"> & {
    uploadDate: string;
    lastModified?: string;
  };
  created_at: string;
  updated_at: string;
}

/**
 * Document creation request body
 */
export interface CreateDocumentBody {
  title: string;
  type: string;
  carId: string;
  location: string;
  metadata: Omit<DocumentMetadata, "uploadDate" | "lastModified">;
}

/**
 * Document update request body
 */
export interface UpdateDocumentBody extends Partial<CreateDocumentBody> {
  metadata?: Partial<Omit<DocumentMetadata, "uploadDate" | "lastModified">>;
}

/**
 * Document deletion request body
 */
export interface DeleteDocumentBody {
  carId: string;
}

/**
 * Response type for document list endpoint
 */
export type DocumentListResponse = PaginatedResponse<StandardizedDocument>;

/**
 * Response type for single document endpoint
 */
export type DocumentResponse = APIResponse<StandardizedDocument>;

/**
 * Response type for car documents endpoint
 */
export type CarDocumentsResponse = APIResponse<StandardizedDocument[]>;

/**
 * Route handler for GET /api/documents
 */
export type GetDocumentsHandler = RouteHandler<DocumentListResponse>;

/**
 * Route handler for POST /api/documents
 */
export type CreateDocumentHandler = RouteHandler<DocumentResponse>;

/**
 * Route handler for GET /api/documents/[id]
 */
export type GetDocumentByIdHandler = RouteHandler<
  DocumentResponse,
  RouteParamsWithId
>;

/**
 * Route handler for PUT /api/documents/[id]
 */
export type UpdateDocumentHandler = RouteHandler<
  DocumentResponse,
  RouteParamsWithId
>;

/**
 * Route handler for DELETE /api/documents/[id]
 */
export type DeleteDocumentHandler = RouteHandler<
  APIResponse<{ success: boolean }>,
  RouteParamsWithId
>;

/**
 * Route handler for GET /api/cars/[id]/documents
 */
export type GetCarDocumentsHandler = RouteHandler<
  CarDocumentsResponse,
  RouteParamsWithId
>;
