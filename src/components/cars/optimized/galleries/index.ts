// Galleries Optimized Module Exports
// Following the established pattern from events, specifications, documentation, and inspections

// Skeleton Component (Available Immediately)
export { GalleriesSkeleton } from "./GalleriesSkeleton";

// Optimized Components (Phase 1E Implementation Complete)
export { GalleriesOptimized } from "./GalleriesOptimized";
export { BaseGalleries } from "./BaseGalleries";
export { GalleriesEditor } from "./GalleriesEditor";

// Types and Interfaces
export interface Gallery {
  _id: string;
  name: string;
  description?: string;
  imageIds: string[];
  primaryImageId?: string;
  createdAt: string;
  updatedAt: string;
  thumbnailImage?: {
    _id: string;
    url: string;
  };
}

export interface GalleriesProps {
  carId: string;
}
