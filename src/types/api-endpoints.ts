// =============================================================================
// API ENDPOINT TYPE DEFINITIONS
// Nuclear Authentication Refactor - Step 6
// =============================================================================

import { Project, ProjectListResponse, CreateProjectRequest } from "./project";
import { Event } from "./event";
import { User } from "../components/users/UserManagement";

// =============================================================================
// USERS API (/api/users)
// =============================================================================

export interface UsersAPI {
  GET: () => Promise<User[]>;
  POST: () => Promise<{ error: string }>; // Deprecated
}

export interface UserResponse extends User {
  _id: string;
  id: string;
  uid: string;
  name: string;
  email: string;
  roles: string[];
  creativeRoles: string[];
  status: string;
  photoURL?: string;
  image?: string;
}

// =============================================================================
// PROJECTS API (/api/projects)
// =============================================================================

export interface ProjectsAPI {
  GET: (params?: ProjectSearchParams) => Promise<ProjectListResponse>;
  POST: (data: CreateProjectRequest) => Promise<{ project: Project }>;
}

export interface ProjectSearchParams {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  clientId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ProjectByIdAPI {
  GET: () => Promise<{ project: Project }>;
  PUT: (data: Partial<Project>) => Promise<{ project: Project }>;
  DELETE: () => Promise<{ success: boolean }>;
}

// =============================================================================
// PROJECT EVENTS API (/api/projects/[id]/events)
// =============================================================================

export interface ProjectEventsAPI {
  GET: () => Promise<Event[]>;
  POST: (data: CreateEventRequest) => Promise<{ event: Event }>;
}

export interface ProjectEventByIdAPI {
  PUT: (data: Partial<Event>) => Promise<{ event: Event }>;
  DELETE: () => Promise<{ success: boolean }>;
}

export interface ProjectEventsAttachAPI {
  POST: (data: { eventId: string }) => Promise<{ success: boolean }>;
}

export interface ProjectEventsDetachAPI {
  POST: (data: { eventId: string }) => Promise<{ success: boolean }>;
}

export interface ProjectEventsBatchAPI {
  POST: (data: { events: CreateEventRequest[] }) => Promise<{ count: number }>;
}

export interface CreateEventRequest {
  type: string;
  title: string;
  description: string;
  url?: string;
  start: string | Date;
  end?: string | Date;
  isAllDay?: boolean;
  teamMemberIds?: string[];
  locationId?: string;
  primaryImageId?: string;
  imageIds?: string[];
}

// =============================================================================
// EVENTS API (/api/events)
// =============================================================================

export interface EventsAPI {
  GET: (params?: EventSearchParams) => Promise<Event[]>;
  POST: (data: CreateEventRequest) => Promise<{ event: Event }>;
}

export interface EventSearchParams {
  status?: string;
  type?: string;
  teamMember?: string;
  assignee?: string; // Legacy parameter name
  car_id?: string;
  project_id?: string;
  from?: string;
  to?: string;
}

export interface EventByIdAPI {
  GET: () => Promise<{ event: Event }>;
  PUT: (data: Partial<Event>) => Promise<{ event: Event }>;
  DELETE: () => Promise<{ success: boolean }>;
}

// =============================================================================
// CARS API (/api/cars)
// =============================================================================

export interface CarsAPI {
  GET: (params?: CarSearchParams) => Promise<Car[]>;
  POST: (data: CreateCarRequest) => Promise<{ car: Car }>;
}

export interface CarSearchParams {
  page?: number;
  limit?: number;
  make?: string;
  model?: string;
  year?: number;
  status?: string;
  search?: string;
}

export interface Car {
  _id: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  color?: string;
  status: "active" | "archived" | "sold";
  images?: string[];
  primaryImageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCarRequest {
  make: string;
  model: string;
  year: number;
  vin?: string;
  color?: string;
  status?: "active" | "archived" | "sold";
}

export interface CarByIdAPI {
  GET: () => Promise<{ car: Car }>;
  PUT: (data: Partial<Car>) => Promise<{ car: Car }>;
  DELETE: () => Promise<{ success: boolean }>;
}

// =============================================================================
// GALLERIES API (/api/galleries)
// =============================================================================

export interface GalleriesAPI {
  GET: (params?: GallerySearchParams) => Promise<Gallery[]>;
  POST: (data: CreateGalleryRequest) => Promise<{ gallery: Gallery }>;
}

export interface Gallery {
  _id: string;
  title: string;
  description?: string;
  images: GalleryImage[];
  carId?: string;
  projectId?: string;
  eventId?: string;
  status: "draft" | "published" | "archived";
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GalleryImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  metadata?: {
    width?: number;
    height?: number;
    fileSize?: number;
    mimeType?: string;
  };
}

export interface GallerySearchParams {
  carId?: string;
  projectId?: string;
  eventId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreateGalleryRequest {
  title: string;
  description?: string;
  carId?: string;
  projectId?: string;
  eventId?: string;
  tags?: string[];
}

export interface GalleryByIdAPI {
  GET: () => Promise<{ gallery: Gallery }>;
  PUT: (data: Partial<Gallery>) => Promise<{ gallery: Gallery }>;
  DELETE: () => Promise<{ success: boolean }>;
}

// =============================================================================
// DELIVERABLES API (/api/deliverables)
// =============================================================================

export interface DeliverablesAPI {
  GET: (params?: DeliverableSearchParams) => Promise<Deliverable[]>;
  POST: (
    data: CreateDeliverableRequest
  ) => Promise<{ deliverable: Deliverable }>;
}

export interface Deliverable {
  _id: string;
  title: string;
  description: string;
  type: "video" | "images" | "document" | "other";
  status: "draft" | "in_progress" | "review" | "completed" | "delivered";
  projectId?: string;
  assignedTo?: string[];
  dueDate?: Date;
  completedAt?: Date;
  files: DeliverableFile[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliverableFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
}

export interface DeliverableSearchParams {
  projectId?: string;
  status?: string;
  type?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
}

export interface CreateDeliverableRequest {
  title: string;
  description: string;
  type: "video" | "images" | "document" | "other";
  projectId?: string;
  assignedTo?: string[];
  dueDate?: Date;
}

export interface DeliverableByIdAPI {
  GET: () => Promise<{ deliverable: Deliverable }>;
  PUT: (data: Partial<Deliverable>) => Promise<{ deliverable: Deliverable }>;
  DELETE: () => Promise<{ success: boolean }>;
}

// =============================================================================
// CONTACTS API (/api/contacts)
// =============================================================================

export interface ContactsAPI {
  GET: (params?: ContactSearchParams) => Promise<Contact[]>;
  POST: (data: CreateContactRequest) => Promise<{ contact: Contact }>;
}

export interface Contact {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  notes?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactSearchParams {
  search?: string;
  company?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

export interface CreateContactRequest {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  notes?: string;
  tags?: string[];
}

export interface ContactByIdAPI {
  GET: () => Promise<{ contact: Contact }>;
  PUT: (data: Partial<Contact>) => Promise<{ contact: Contact }>;
  DELETE: () => Promise<{ success: boolean }>;
}

// =============================================================================
// UPLOAD API (/api/upload)
// =============================================================================

export interface UploadAPI {
  POST: (formData: FormData) => Promise<UploadResponse>;
}

export interface UploadResponse {
  files: UploadedFile[];
  success: boolean;
  message?: string;
}

export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}

// =============================================================================
// IMAGES API (/api/images)
// =============================================================================

export interface ImagesAPI {
  GET: (params?: ImageSearchParams) => Promise<Image[]>;
  POST: (formData: FormData) => Promise<{ image: Image }>;
}

export interface Image {
  _id: string;
  filename: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
  metadata: {
    width: number;
    height: number;
    camera?: string;
    lens?: string;
    settings?: {
      iso?: number;
      aperture?: string;
      shutterSpeed?: string;
      focalLength?: string;
    };
  };
  tags: string[];
  carId?: string;
  projectId?: string;
  eventId?: string;
  galleryId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImageSearchParams {
  carId?: string;
  projectId?: string;
  eventId?: string;
  galleryId?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

export interface ImageByIdAPI {
  GET: () => Promise<{ image: Image }>;
  PUT: (data: Partial<Image>) => Promise<{ image: Image }>;
  DELETE: () => Promise<{ success: boolean }>;
}

// =============================================================================
// SYSTEM APIs
// =============================================================================

export interface SystemHealthAPI {
  GET: () => Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    services: {
      database: "up" | "down";
      auth: "up" | "down";
      storage: "up" | "down";
    };
  }>;
}

export interface SystemStatsAPI {
  GET: () => Promise<{
    users: { total: number; active: number };
    projects: { total: number; active: number };
    events: { total: number; thisMonth: number };
    storage: { used: number; available: number };
  }>;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export interface APIError {
  error: string;
  message?: string;
  code?: string;
  details?: any;
}

export interface ValidationError extends APIError {
  field: string;
  value: any;
  constraint: string;
}

// =============================================================================
// GENERIC RESPONSE TYPES
// =============================================================================

export interface SuccessResponse {
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// =============================================================================
// HTTP METHOD TYPES FOR TYPED ENDPOINTS
// =============================================================================

export type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface TypedEndpoint<TResponse = any, TRequest = any> {
  path: string;
  method: HTTPMethod;
  request?: TRequest;
  response: TResponse;
}

// =============================================================================
// ENDPOINT REGISTRY - Complete type-safe API definition
// =============================================================================

export interface APIEndpoints {
  // Users
  "/api/users": UsersAPI;

  // Projects
  "/api/projects": ProjectsAPI;
  "/api/projects/[id]": ProjectByIdAPI;
  "/api/projects/[id]/events": ProjectEventsAPI;
  "/api/projects/[id]/events/[eventId]": ProjectEventByIdAPI;
  "/api/projects/[id]/events/attach": ProjectEventsAttachAPI;
  "/api/projects/[id]/events/detach": ProjectEventsDetachAPI;
  "/api/projects/[id]/events/batch": ProjectEventsBatchAPI;

  // Events
  "/api/events": EventsAPI;
  "/api/events/[id]": EventByIdAPI;

  // Cars
  "/api/cars": CarsAPI;
  "/api/cars/[id]": CarByIdAPI;

  // Galleries
  "/api/galleries": GalleriesAPI;
  "/api/galleries/[id]": GalleryByIdAPI;

  // Deliverables
  "/api/deliverables": DeliverablesAPI;
  "/api/deliverables/[id]": DeliverableByIdAPI;

  // Contacts
  "/api/contacts": ContactsAPI;
  "/api/contacts/[id]": ContactByIdAPI;

  // Media
  "/api/upload": UploadAPI;
  "/api/images": ImagesAPI;
  "/api/images/[id]": ImageByIdAPI;

  // System
  "/api/system/health": SystemHealthAPI;
  "/api/system/stats": SystemStatsAPI;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

// Extract response type from an endpoint
export type EndpointResponse<T extends keyof APIEndpoints> =
  APIEndpoints[T] extends { GET: () => Promise<infer R> }
    ? R
    : APIEndpoints[T] extends { POST: (data: any) => Promise<infer R> }
      ? R
      : APIEndpoints[T] extends { PUT: (data: any) => Promise<infer R> }
        ? R
        : never;

// Extract request type from an endpoint
export type EndpointRequest<T extends keyof APIEndpoints> =
  APIEndpoints[T] extends { POST: (data: infer R) => Promise<any> }
    ? R
    : APIEndpoints[T] extends { PUT: (data: infer R) => Promise<any> }
      ? R
      : never;
