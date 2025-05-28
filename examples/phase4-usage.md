# Phase 4 Image Optimization Usage Examples

## 🚀 **Quick Start Guide**

### **1. Basic Progressive Image Loading**

Replace existing image components with progressive loading:

```typescript
// Before (basic image)
<img src={imageUrl} alt="Car image" />

// After (progressive loading)
import { ProgressiveImage } from "@/components/ui/ProgressiveImage";

<ProgressiveImage
  src={imageUrl}
  alt="Car image"
  width={400}
  height={300}
  placeholder="skeleton"
  preloadStrategy="viewport"
/>
```

### **2. Enable Web Worker Processing**

Add image processing capabilities:

```typescript
import { useImageWorker } from "@/lib/image/worker-client";

function ImageUploader() {
  const { isProcessing, resizeImage, isAvailable } = useImageWorker();

  const handleFileUpload = async (file: File) => {
    if (isAvailable) {
      // Process with Web Worker (non-blocking)
      const result = await resizeImage(file, {
        width: 800,
        height: 600,
        quality: 85,
      });

      if (result) {
        console.log(`Compressed ${result.compressionRatio}%`);
      }
    } else {
      // Fallback to server-side processing
      console.log("Using server-side processing");
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleFileUpload(e.target.files[0])} />
      {isProcessing && <div>Processing image...</div>}
    </div>
  );
}
```

### **3. Progressive Image Gallery**

Create optimized image galleries:

```typescript
import { ProgressiveImageGallery } from "@/components/ui/ProgressiveImage";

function CarGallery({ carImages }) {
  return (
    <ProgressiveImageGallery
      images={carImages.map(img => ({
        src: img.url,
        alt: img.filename,
        id: img._id,
      }))}
      columns={4}
      autoOptimize={true}
      thumbnailSize={{ width: 300, height: 200 }}
      onImageClick={(image, index) => {
        console.log(`Clicked image ${index}:`, image);
      }}
    />
  );
}
```

---

## 📊 **Performance Monitoring**

### **1. Development Performance Stats**

Enable performance monitoring in development:

```typescript
<ProgressiveImage
  src={imageUrl}
  alt="Car image"
  showLoadingStats={process.env.NODE_ENV === "development"}
  onLoad={(element) => {
    console.log("Image loaded:", element.src);
  }}
  onError={(element, error) => {
    console.error("Image failed:", error);
  }}
/>
```

### **2. Progressive Loader Statistics**

Monitor loading performance:

```typescript
import { progressiveLoader } from "@/lib/image/progressive-loader";

// Get loading statistics
const stats = progressiveLoader.getStats();
console.log("Loading Stats:", {
  total: stats.total,
  loaded: stats.loaded,
  errors: stats.errors,
  avgLoadTime: stats.avgLoadTime,
  successRate: stats.successRate,
});

// Preload critical images
await progressiveLoader.preloadImages([
  "/images/hero-image.jpg",
  "/images/featured-car.jpg",
]);
```

### **3. Web Worker Performance**

Monitor worker performance:

```typescript
import { imageWorker } from "@/lib/image/worker-client";

// Check worker availability
if (imageWorker.isAvailable()) {
  console.log("Web Worker ready for processing");

  // Get worker statistics
  const stats = imageWorker.getStats();
  console.log("Worker Stats:", {
    pendingOperations: stats.pendingOperations,
    messageId: stats.messageId,
  });
}
```

---

## 🔧 **Advanced Usage Examples**

### **1. Batch Image Processing**

Process multiple images efficiently:

```typescript
import { useImageWorker } from "@/lib/image/worker-client";

function BatchImageProcessor() {
  const { batchProcess, progress, isProcessing } = useImageWorker();

  const handleBatchUpload = async (files: FileList) => {
    const images = Array.from(files).map((file, index) => ({
      name: file.name,
      data: file,
    }));

    const result = await batchProcess(images, {
      operation: "thumbnail",
      options: {
        width: 200,
        height: 200,
        quality: 80,
      },
      onProgress: (progress) => {
        console.log(`Processing: ${progress.percentage}% (${progress.current}/${progress.total})`);
        console.log(`Current: ${progress.currentImage}`);
      },
    });

    if (result) {
      console.log(`Batch complete: ${result.summary.successful}/${result.summary.total} successful`);

      // Process results
      result.results.forEach((item, index) => {
        if (item.success && item.result) {
          const thumbnailUrl = imageWorker.arrayBufferToBlobUrl(
            item.result.arrayBuffer,
            "image/jpeg"
          );
          console.log(`Thumbnail ${index}:`, thumbnailUrl);
        }
      });
    }
  };

  return (
    <div>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => handleBatchUpload(e.target.files)}
      />

      {isProcessing && progress && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress.percentage}%` }} />
          <span>{progress.percentage}% - {progress.currentImage}</span>
        </div>
      )}
    </div>
  );
}
```

### **2. Image Analysis and Optimization**

Analyze images before processing:

```typescript
import { useImageWorker } from "@/lib/image/worker-client";

function ImageAnalyzer() {
  const { analyzeImage, compressImage } = useImageWorker();

  const handleImageAnalysis = async (file: File) => {
    // Analyze image properties
    const analysis = await analyzeImage(file);

    if (analysis) {
      console.log("Image Analysis:", {
        dimensions: `${analysis.width}x${analysis.height}`,
        aspectRatio: analysis.aspectRatio.toFixed(2),
        brightness: analysis.avgBrightness,
        saturation: analysis.avgSaturation,
        orientation: analysis.isLandscape ? "Landscape" :
                    analysis.isPortrait ? "Portrait" : "Square",
        dominantColors: analysis.dominantColors,
      });

      // Optimize based on analysis
      let quality = 85;
      if (analysis.avgBrightness < 50) {
        quality = 90; // Higher quality for dark images
      }
      if (analysis.width > 2000 || analysis.height > 2000) {
        quality = 75; // Lower quality for large images
      }

      const optimized = await compressImage(file, {
        quality: quality / 100,
        format: "jpeg",
      });

      if (optimized) {
        console.log(`Optimized: ${optimized.compressionRatio}% smaller`);
      }
    }
  };

  return (
    <input
      type="file"
      accept="image/*"
      onChange={(e) => handleImageAnalysis(e.target.files[0])}
    />
  );
}
```

### **3. Progressive Image with Zoom**

Implement image zoom functionality:

```typescript
import { ProgressiveImageWithZoom } from "@/components/ui/ProgressiveImage";

function CarDetailImage({ car }) {
  return (
    <ProgressiveImageWithZoom
      src={car.thumbnailUrl}
      zoomSrc={car.fullResolutionUrl}
      alt={`${car.make} ${car.model}`}
      width={600}
      height={400}
      zoomQuality={95}
      priority={true}
      placeholder="blur"
      onLoad={() => console.log("Car image loaded")}
    />
  );
}
```

### **4. Server-Side Image Optimization**

Use the optimization API:

```typescript
// Optimize image on server
async function optimizeImageOnServer(file: File, options = {}) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("options", JSON.stringify({
    operation: "compress",
    quality: 85,
    format: "webp",
    ...options,
  }));

  try {
    const response = await fetch("/api/images/optimize", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      console.log("Server Optimization Result:", {
        originalSize: `${(result.original.size / 1024).toFixed(1)}KB`,
        optimizedSize: `${(result.optimized.size / 1024).toFixed(1)}KB`,
        compressionRatio: `${result.compression.ratio}%`,
        processingTime: `${result.performance.processingTime}ms`,
      });

      return result.dataUrl; // Optimized image as data URL
    }
  } catch (error) {
    console.error("Server optimization failed:", error);
    return null;
  }
}

// Usage in component
function ImageUploader() {
  const [optimizedImage, setOptimizedImage] = useState(null);

  const handleUpload = async (file: File) => {
    const optimized = await optimizeImageOnServer(file, {
      operation: "thumbnail",
      width: 300,
      height: 200,
      format: "webp",
    });

    if (optimized) {
      setOptimizedImage(optimized);
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
      {optimizedImage && (
        <img src={optimizedImage} alt="Optimized" />
      )}
    </div>
  );
}
```

---

## 🎨 **Styling and Customization**

### **1. Custom CSS Classes**

Apply custom styling to progressive images:

```css
/* Import progressive image styles */
@import "@/styles/progressive-image.css";

/* Custom gallery styling */
.custom-car-gallery {
  .progressive-gallery-item {
    border-radius: 12px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease;
  }

  .progressive-gallery-item:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  }
}

/* Custom loading skeleton */
.custom-skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: custom-loading 1.5s ease-in-out infinite;
}

@keyframes custom-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
```

### **2. Responsive Image Gallery**

Create responsive galleries:

```typescript
function ResponsiveCarGallery({ images }) {
  const [columns, setColumns] = useState(4);

  useEffect(() => {
    const updateColumns = () => {
      if (window.innerWidth < 640) setColumns(2);
      else if (window.innerWidth < 1024) setColumns(3);
      else setColumns(4);
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  return (
    <ProgressiveImageGallery
      images={images}
      columns={columns}
      gap={4}
      thumbnailSize={{
        width: columns === 2 ? 200 : 300,
        height: columns === 2 ? 150 : 200,
      }}
      autoOptimize={true}
      className="responsive-gallery"
    />
  );
}
```

---

## 🔍 **Debugging and Troubleshooting**

### **1. Debug Progressive Loading**

Monitor loading behavior:

```typescript
import { progressiveLoader } from "@/lib/image/progressive-loader";

// Enable debug mode
const debugLoader = new ProgressiveImageLoader({
  onLoad: (element) => {
    console.log("✅ Loaded:", element.src);
  },
  onError: (element, error) => {
    console.error("❌ Failed:", element.src, error);
  },
  onProgress: (loaded, total) => {
    console.log(`📊 Progress: ${loaded}/${total} (${Math.round(loaded/total*100)}%)`);
  },
});

// Use debug loader
<ProgressiveImage
  src={imageUrl}
  alt="Debug image"
  showLoadingStats={true}
/>
```

### **2. Web Worker Debugging**

Debug worker operations:

```typescript
import { imageWorker } from "@/lib/image/worker-client";

// Monitor worker messages
const originalPostMessage = imageWorker.worker?.postMessage;
if (originalPostMessage) {
  imageWorker.worker.postMessage = function (message) {
    console.log("🔧 Worker Message:", message);
    return originalPostMessage.call(this, message);
  };
}

// Check worker capabilities
console.log("Worker Available:", imageWorker.isAvailable());
console.log("Worker Stats:", imageWorker.getStats());
```

### **3. Performance Debugging**

Monitor performance metrics:

```typescript
// Performance observer for images
const imageObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.name.includes("image")) {
      console.log("🏃 Image Performance:", {
        name: entry.name,
        duration: entry.duration,
        startTime: entry.startTime,
      });
    }
  });
});

imageObserver.observe({ entryTypes: ["resource"] });

// Memory usage monitoring
setInterval(() => {
  if (performance.memory) {
    console.log("💾 Memory Usage:", {
      used: `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB`,
      total: `${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB`,
      limit: `${(performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1)}MB`,
    });
  }
}, 5000);
```

---

## 🚀 **Production Deployment**

### **1. Environment Configuration**

Configure for production:

```typescript
// next.config.js
module.exports = {
  // Enable image optimization
  images: {
    domains: ["your-domain.com"],
    formats: ["image/webp", "image/avif"],
  },

  // Web Worker configuration
  webpack: (config) => {
    config.module.rules.push({
      test: /\.worker\.js$/,
      use: { loader: "worker-loader" },
    });
    return config;
  },
};

// Environment variables
NEXT_PUBLIC_ENABLE_IMAGE_OPTIMIZATION = true;
NEXT_PUBLIC_ENABLE_WEB_WORKERS = true;
NEXT_PUBLIC_IMAGE_QUALITY = 85;
```

### **2. Performance Monitoring**

Set up production monitoring:

```typescript
// Performance monitoring service
class ImagePerformanceMonitor {
  static track(event: string, data: any) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event, {
        custom_parameter_1: data.loadTime,
        custom_parameter_2: data.imageSize,
        custom_parameter_3: data.compressionRatio,
      });
    }
  }
}

// Use in components
<ProgressiveImage
  src={imageUrl}
  alt="Monitored image"
  onLoad={(element) => {
    ImagePerformanceMonitor.track('image_loaded', {
      loadTime: performance.now(),
      imageSize: element.naturalWidth * element.naturalHeight,
    });
  }}
/>
```

This completes the Phase 4 implementation with comprehensive image optimization, progressive loading, Web Worker processing, and performance monitoring capabilities!
