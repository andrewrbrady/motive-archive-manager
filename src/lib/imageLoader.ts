import { getFormattedImageUrl } from "@/lib/cloudflare";

export interface PaginatedImagesResponse {
  images: ImageData[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ImageData {
  _id: string;
  url: string;
  cloudflareId?: string;
  filename?: string;
  metadata?: {
    category?: string;
    description?: string;
    isPrimary?: boolean;
    [key: string]: any;
  };
  carId?: string;
}

export interface CarData {
  _id: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  displayImage?: {
    _id: string;
    url: string;
    metadata?: {
      category?: string;
      description?: string;
      isPrimary?: boolean;
      [key: string]: any;
    };
  };
  [key: string]: any;
}

export interface ImageLoaderOptions {
  carId?: string;
  clientId?: string;
  page?: number;
  limit?: number;
  category?: string;
}

/**
 * Loads car images with pagination support
 */
export async function loadCarImages(
  options: ImageLoaderOptions
): Promise<PaginatedImagesResponse> {
  const { carId, page = 1, limit = 20, category } = options;

  if (!carId) {
    throw new Error("Car ID is required");
  }

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (category) {
    queryParams.append("category", category);
  }

  const response = await fetch(
    `/api/cars/${carId}/images?${queryParams.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to load images");
  }

  const data = await response.json();
  return data;
}

/**
 * Loads client car images with pagination support
 */
export async function loadClientCarImages(
  options: ImageLoaderOptions
): Promise<PaginatedImagesResponse> {
  const { clientId, page = 1, limit = 20 } = options;

  if (!clientId) {
    throw new Error("Client ID is required");
  }

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await fetch(
    `/api/clients/${clientId}/cars?${queryParams.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to load client cars");
  }

  const data = await response.json();

  // Extract primary images from cars
  const images = data.cars
    .filter((car: CarData) => car.displayImage)
    .map((car: CarData) => ({
      _id: car.displayImage?._id || car._id,
      url: car.displayImage?.url || "",
      metadata: {
        ...car.displayImage?.metadata,
        make: car.make,
        model: car.model,
        year: car.year,
        vin: car.vin,
      },
      carId: car._id,
    }));

  return {
    images,
    pagination: data.pagination,
  };
}

/**
 * Loads a single image by ID
 */
export async function loadImageById(imageId: string): Promise<ImageData> {
  const response = await fetch(`/api/images/${imageId}`);

  if (!response.ok) {
    throw new Error("Failed to load image");
  }

  const data = await response.json();
  return data;
}

/**
 * Preloads an image to ensure it's in the browser cache
 */
export function preloadImage(url: string, variant?: string): Promise<boolean> {
  return new Promise((resolve) => {
    const formattedUrl = variant
      ? getFormattedImageUrl(url, variant)
      : getFormattedImageUrl(url);
    const img = new Image();

    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = formattedUrl;
  });
}

/**
 * Preloads multiple images to ensure they're in the browser cache
 */
export async function preloadImages(
  urls: string[],
  variant?: string
): Promise<boolean[]> {
  return Promise.all(urls.map((url) => preloadImage(url, variant)));
}
