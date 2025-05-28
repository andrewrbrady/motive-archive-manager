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
  metadata: {
    angle?: string;
    view?: string;
    movement?: string;
    tod?: string;
    side?: string;
    description?: string;
    isPrimary?: boolean;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

// Generate URL variations for different quality/size options
export function getUrlVariations(baseUrl: string) {
  const baseWithoutVariant = baseUrl.replace(/\/[^/]+$/, "");
  return {
    original: baseUrl,
    w1500: `${baseWithoutVariant}/publicw=1500`,
    w2000: `${baseWithoutVariant}/publicw=2000`,
    w2000q80: `${baseWithoutVariant}/publicw=2000,q=80`,
    w3000: `${baseWithoutVariant}/publicw=3000`,
    w3000q90: `${baseWithoutVariant}/publicw=3000,q=90`,
    fullQuality: `${baseWithoutVariant}/publicq=100`,
  };
}
