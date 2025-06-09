export const uploadConfig = {
  // Maximum file size for individual files (in bytes)
  maxFileSize: 8 * 1024 * 1024, // 8MB per file

  // Maximum total request size (in bytes)
  maxRequestSize: 50 * 1024 * 1024, // 50MB total request

  // Maximum number of files per request
  maxFiles: 10,

  // Supported file types
  supportedTypes: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ],

  // Request timeout (in milliseconds)
  timeout: 300000, // 5 minutes
};

export const apiConfig = {
  // Force dynamic for all upload endpoints
  dynamic: "force-dynamic" as const,

  // Maximum execution time
  maxDuration: 300,

  // Memory allocation
  memory: 1536,
};
