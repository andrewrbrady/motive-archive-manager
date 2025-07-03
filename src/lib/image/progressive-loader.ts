/**
 * Progressive Image Loading System - Phase 4 Performance Optimization
 *
 * Implements intelligent image loading with:
 * 1. ✅ Intersection Observer for lazy loading
 * 2. ✅ Progressive enhancement with placeholders
 * 3. ✅ Intelligent preloading strategies
 * 4. ✅ Error handling and fallbacks
 * 5. ✅ Performance monitoring
 */

import React from "react";

interface ProgressiveImageOptions {
  threshold?: number; // Intersection threshold (0-1)
  rootMargin?: string; // Root margin for intersection observer
  quality?: number; // Image quality (1-100)
  placeholder?: "blur" | "skeleton" | "none";
  preloadStrategy?: "none" | "viewport" | "hover" | "immediate";
  retryAttempts?: number;
  onLoad?: (element: HTMLImageElement) => void;
  onError?: (element: HTMLImageElement, error: Error) => void;
  onProgress?: (loaded: number, total: number) => void;
}

interface ImageLoadState {
  status: "idle" | "loading" | "loaded" | "error";
  attempts: number;
  loadTime?: number;
  error?: Error;
}

/**
 * Progressive Image Loader Class
 */
export class ProgressiveImageLoader {
  private observer: IntersectionObserver | null = null;
  private imageStates = new Map<HTMLImageElement, ImageLoadState>();
  private preloadCache = new Set<string>();
  private options: Required<ProgressiveImageOptions>;

  constructor(options: ProgressiveImageOptions = {}) {
    this.options = {
      threshold: 0.1,
      rootMargin: "50px",
      quality: 85,
      placeholder: "skeleton",
      preloadStrategy: "viewport",
      retryAttempts: 3,
      onLoad: () => {},
      onError: () => {},
      onProgress: () => {},
      ...options,
    };

    this.initializeObserver();
  }

  /**
   * Initialize Intersection Observer for lazy loading
   */
  private initializeObserver(): void {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadImage(img);
            this.observer?.unobserve(img);
          }
        });
      },
      {
        threshold: this.options.threshold,
        rootMargin: this.options.rootMargin,
      }
    );
  }

  /**
   * Register an image for progressive loading
   */
  public observe(img: HTMLImageElement, src: string): void {
    if (!img || !src) return;

    // Initialize image state
    this.imageStates.set(img, {
      status: "idle",
      attempts: 0,
    });

    // Set data attributes for loading
    img.dataset.src = src;
    img.dataset.loaded = "false";

    // Apply placeholder
    this.applyPlaceholder(img);

    // Handle different preload strategies
    switch (this.options.preloadStrategy) {
      case "immediate":
        this.loadImage(img);
        break;
      case "hover":
        this.setupHoverPreload(img);
        break;
      case "viewport":
      default:
        if (this.observer) {
          this.observer.observe(img);
        } else {
          // Fallback for browsers without IntersectionObserver
          this.loadImage(img);
        }
        break;
    }
  }

  /**
   * Apply placeholder based on strategy
   */
  private applyPlaceholder(img: HTMLImageElement): void {
    const { placeholder } = this.options;

    switch (placeholder) {
      case "blur":
        img.style.filter = "blur(5px)";
        img.style.transition = "filter 0.3s ease";
        break;
      case "skeleton":
        img.classList.add("progressive-skeleton");
        break;
      case "none":
      default:
        break;
    }
  }

  /**
   * Setup hover preloading
   */
  private setupHoverPreload(img: HTMLImageElement): void {
    const handleHover = () => {
      this.loadImage(img);
      img.removeEventListener("mouseenter", handleHover);
    };

    img.addEventListener("mouseenter", handleHover);

    // Still observe for viewport loading as fallback
    if (this.observer) {
      this.observer.observe(img);
    }
  }

  /**
   * Load image with retry logic and performance monitoring
   */
  private async loadImage(img: HTMLImageElement): Promise<void> {
    const src = img.dataset.src;
    if (!src) return;

    const state = this.imageStates.get(img);
    if (!state || state.status === "loading" || state.status === "loaded") {
      return;
    }

    // Update state
    state.status = "loading";
    state.attempts++;
    const startTime = performance.now();

    try {
      // Create new image for loading
      const newImg = new Image();

      // Set up promise for loading
      const loadPromise = new Promise<void>((resolve, reject) => {
        newImg.onload = () => resolve();
        newImg.onerror = () => reject(new Error("Failed to load image"));
      });

      // Start loading
      newImg.src = this.getOptimizedSrc(src);

      // Wait for load
      await loadPromise;

      // Update original image
      img.src = newImg.src;
      img.dataset.loaded = "true";

      // Remove placeholder effects
      this.removePlaceholder(img);

      // Update state
      state.status = "loaded";
      state.loadTime = performance.now() - startTime;

      // Call success callback
      this.options.onLoad(img);

      // Log performance in development
      if (process.env.NODE_ENV === "development") {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`📸 Image loaded: ${src} (${state.loadTime.toFixed(2)}ms)`);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      state.error = err;

      // Retry logic
      if (state.attempts < this.options.retryAttempts) {
        console.warn(
          `Retrying image load (${state.attempts}/${this.options.retryAttempts}):`,
          src
        );
        setTimeout(() => this.loadImage(img), 1000 * state.attempts);
        return;
      }

      // Final failure
      state.status = "error";
      this.handleImageError(img, err);
    }
  }

  /**
   * Get optimized image source with quality and format
   */
  private getOptimizedSrc(src: string): string {
    // If it's already a Cloudflare URL, return as-is
    if (
      src.includes("imagedelivery.net") ||
      src.includes("cloudflareimages.com")
    ) {
      return src;
    }

    // Add quality parameter if not present
    const url = new URL(src, window.location.origin);
    if (!url.searchParams.has("quality")) {
      url.searchParams.set("quality", this.options.quality.toString());
    }

    return url.toString();
  }

  /**
   * Remove placeholder effects
   */
  private removePlaceholder(img: HTMLImageElement): void {
    const { placeholder } = this.options;

    switch (placeholder) {
      case "blur":
        img.style.filter = "none";
        break;
      case "skeleton":
        img.classList.remove("progressive-skeleton");
        break;
    }
  }

  /**
   * Handle image loading errors
   */
  private handleImageError(img: HTMLImageElement, error: Error): void {
    console.error("Image failed to load:", img.dataset.src, error);

    // Apply error styling
    img.classList.add("progressive-error");

    // Call error callback
    this.options.onError(img, error);
  }

  /**
   * Preload images for better performance
   */
  public preloadImages(urls: string[]): Promise<boolean[]> {
    return Promise.all(
      urls.map(async (url) => {
        if (this.preloadCache.has(url)) {
          return true;
        }

        try {
          const img = new Image();
          const loadPromise = new Promise<boolean>((resolve) => {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
          });

          img.src = this.getOptimizedSrc(url);
          const success = await loadPromise;

          if (success) {
            this.preloadCache.add(url);
          }

          return success;
        } catch {
          return false;
        }
      })
    );
  }

  /**
   * Get loading statistics
   */
  public getStats() {
    const states = Array.from(this.imageStates.values());
    const total = states.length;
    const loaded = states.filter((s) => s.status === "loaded").length;
    const loading = states.filter((s) => s.status === "loading").length;
    const errors = states.filter((s) => s.status === "error").length;
    const avgLoadTime =
      states
        .filter((s) => s.loadTime)
        .reduce((sum, s) => sum + (s.loadTime || 0), 0) / loaded || 0;

    return {
      total,
      loaded,
      loading,
      errors,
      avgLoadTime: Math.round(avgLoadTime * 100) / 100,
      successRate: total > 0 ? Math.round((loaded / total) * 100) : 0,
      preloadCacheSize: this.preloadCache.size,
    };
  }

  /**
   * Cleanup observer and event listeners
   */
  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.imageStates.clear();
    this.preloadCache.clear();
  }
}

/**
 * Global progressive image loader instance
 */
export const progressiveLoader = new ProgressiveImageLoader({
  threshold: 0.1,
  rootMargin: "100px",
  quality: 85,
  placeholder: "skeleton",
  preloadStrategy: "viewport",
  retryAttempts: 3,
});

/**
 * React hook for progressive image loading
 */
export function useProgressiveImage(
  src: string,
  options: ProgressiveImageOptions = {}
) {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    const img = imgRef.current;
    if (!img || !src) return;

    const loader = new ProgressiveImageLoader({
      ...options,
      onLoad: () => {
        setLoaded(true);
        options.onLoad?.(img);
      },
      onError: (_, err) => {
        setError(err);
        options.onError?.(img, err);
      },
    });

    loader.observe(img, src);

    return () => loader.destroy();
  }, [src, options]);

  return { imgRef, loaded, error };
}
