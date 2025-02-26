// Define ImageMetadata interface directly instead of importing it
export interface ImageMetadata {
  description?: string;
  tags?: string[];
  [key: string]: any;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "analyzing" | "complete" | "error";
  error?: string;
  currentStep?: string;
  imageUrl?: string;
  metadata?: ImageMetadata;
}

export interface ImageVariants {
  [key: string]: string;
}

export interface Image {
  id: string;
  url: string;
  filename: string;
  metadata: ImageMetadata;
  variants?: ImageVariants;
  createdAt: string;
  updatedAt: string;
}
