export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
}

export interface Gallery {
  id: string;
  name: string;
  description?: string;
  images: GalleryImage[];
  createdAt: string;
  updatedAt: string;
}

export interface FilterState {
  angle?: string;
  view?: string;
  movement?: string;
  tod?: string;
  side?: string;
  imageType?: string; // "with-id" | "processed" | "all"
  hasImageId?: boolean; // Filter for images that have imageId
}

export interface FilterOptions {
  angles: string[];
  views: string[];
  movements: string[];
  tods: string[];
  sides: string[];
}

export interface ExtendedImageType {
  id: string;
  _id: string;
  url: string;
  filename: string;
  imageId?: string;
  metadata: {
    angle?: string;
    view?: string;
    movement?: string;
    tod?: string;
    side?: string;
    description?: string;
    isPrimary?: boolean;
    imageId?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}
