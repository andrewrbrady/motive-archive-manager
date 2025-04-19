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
