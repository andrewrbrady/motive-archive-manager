export interface Image {
  id: string;
  url: string;
  filename: string;
  metadata?: {
    description?: string;
    category?: string;
    angle?: string;
    movement?: string;
    tod?: string;
    view?: string;
    side?: string;
    isPrimary?: boolean;
    [key: string]: any;
  };
  variants?: {
    [key: string]: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Gallery {
  _id: string;
  name: string;
  description?: string;
  imageIds: string[];
  primaryImageId?: string;
  thumbnailImage?: {
    _id: string;
    url: string;
  };
  createdAt: string;
  updatedAt: string;
}
