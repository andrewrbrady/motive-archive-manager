import React, { useRef, useState } from "react";
import { Upload, Check, X as XIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { heicTo, isHeic } from "heic-to";

interface UploadedImage {
  id: string;
  cloudflareId: string;
  filename: string;
  url: string;
}

interface InspectionImageUploadProps {
  onImagesUploaded?: (images: UploadedImage[]) => void;
  onError?: (error: string) => void;
  multiple?: boolean;
}

interface FileProgress {
  file: File;
  percent: number;
  status: "idle" | "uploading" | "complete" | "error";
  error?: string;
}

const InspectionImageUpload: React.FC<InspectionImageUploadProps> = ({
  onImagesUploaded,
  onError,
  multiple = true,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<FileProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [overallError, setOverallError] = useState<string | null>(null);

  // File validation constants
  const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB limit (reduced for Vercel)
  const COMPRESSION_THRESHOLD = 2 * 1024 * 1024; // 2MB - compress files larger than this
  const BLOCKED_EXTENSIONS = [
    ".dng",
    ".cr2",
    ".cr3",
    ".nef",
    ".arw",
    ".orf",
    ".rw2",
  ];
  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
  ];
  const ALLOWED_EXTENSIONS = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".heic",
    ".heif",
  ];

  // Convert HEIC file to JPEG
  const convertHeicToJpeg = async (file: File): Promise<File> => {
    try {
      const jpegBlob = await heicTo({
        blob: file,
        type: "image/jpeg",
        quality: 0.9, // High quality conversion
      });

      // Create a new File object with the converted blob
      const convertedFile = new File(
        [jpegBlob],
        file.name.replace(/\.(heic|heif)$/i, ".jpg"),
        {
          type: "image/jpeg",
          lastModified: file.lastModified,
        }
      );

      return convertedFile;
    } catch (error) {
      console.error("HEIC conversion failed:", error);
      throw new Error(`Failed to convert HEIC file "${file.name}" to JPEG`);
    }
  };

  // Compress image file if it's too large
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      // Only compress JPEG and PNG files
      if (
        !file.type.includes("jpeg") &&
        !file.type.includes("jpg") &&
        !file.type.includes("png")
      ) {
        resolve(file);
        return;
      }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 1920px width/height)
        const maxDimension = 1920;
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);

        // Start with high quality and reduce if needed
        let quality = 0.8;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to compress image"));
                return;
              }

              // If still too large and quality can be reduced, try again
              if (blob.size > MAX_FILE_SIZE && quality > 0.3) {
                quality -= 0.1;
                tryCompress();
                return;
              }

              // Create compressed file
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: file.lastModified,
              });

              resolve(compressedFile);
            },
            file.type,
            quality
          );
        };

        tryCompress();
      };

      img.onerror = () => {
        reject(new Error("Failed to load image for compression"));
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // Validate individual file
  const validateFile = async (
    file: File
  ): Promise<{ isValid: boolean; error?: string; convertedFile?: File }> => {
    // Check file size first
    if (file.size > MAX_FILE_SIZE) {
      // If it's a compressible image type and over the compression threshold, try to compress
      if (
        (file.type.includes("jpeg") ||
          file.type.includes("jpg") ||
          file.type.includes("png")) &&
        file.size > COMPRESSION_THRESHOLD
      ) {
        try {
          console.log(
            `[Validation] Attempting to compress large file "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)}MB)`
          );
          const compressedFile = await compressImage(file);

          if (compressedFile.size <= MAX_FILE_SIZE) {
            console.log(
              `[Validation] Successfully compressed "${file.name}" from ${(file.size / 1024 / 1024).toFixed(1)}MB to ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB`
            );
            return {
              isValid: true,
              convertedFile: compressedFile,
            };
          } else {
            return {
              isValid: false,
              error: `File "${file.name}" is too large even after compression (${(compressedFile.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 4MB.`,
            };
          }
        } catch (compressionError) {
          console.error(
            `[Validation] Compression failed for "${file.name}":`,
            compressionError
          );
          return {
            isValid: false,
            error: `File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB) and compression failed. Maximum size is 4MB.`,
          };
        }
      } else {
        return {
          isValid: false,
          error: `File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 4MB.`,
        };
      }
    }

    const fileName = file.name.toLowerCase();
    const extension = fileName.substring(fileName.lastIndexOf("."));

    // Check if it's a HEIC file that needs conversion
    if (extension === ".heic" || extension === ".heif") {
      try {
        // Verify it's actually a HEIC file
        const isActuallyHeic = await isHeic(file);
        if (!isActuallyHeic) {
          return {
            isValid: false,
            error: `File "${file.name}" appears to be corrupted or not a valid HEIC file.`,
          };
        }

        // Convert HEIC to JPEG
        const convertedFile = await convertHeicToJpeg(file);

        // Check converted file size and compress if needed
        if (convertedFile.size > MAX_FILE_SIZE) {
          if (convertedFile.size > COMPRESSION_THRESHOLD) {
            try {
              console.log(
                `[Validation] Compressing converted HEIC file "${file.name}"`
              );
              const compressedFile = await compressImage(convertedFile);

              if (compressedFile.size <= MAX_FILE_SIZE) {
                return {
                  isValid: true,
                  convertedFile: compressedFile,
                };
              } else {
                return {
                  isValid: false,
                  error: `File "${file.name}" is too large after conversion and compression (${(compressedFile.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 4MB.`,
                };
              }
            } catch (compressionError) {
              return {
                isValid: false,
                error: `File "${file.name}" is too large after conversion (${(convertedFile.size / 1024 / 1024).toFixed(1)}MB) and compression failed. Maximum size is 4MB.`,
              };
            }
          } else {
            return {
              isValid: false,
              error: `File "${file.name}" is too large after conversion (${(convertedFile.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 4MB.`,
            };
          }
        }

        return {
          isValid: true,
          convertedFile,
        };
      } catch (error) {
        return {
          isValid: false,
          error: `Failed to convert HEIC file "${file.name}": ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }

    // Check for other blocked extensions
    const hasBlockedExtension = BLOCKED_EXTENSIONS.some((ext) =>
      fileName.endsWith(ext)
    );

    if (hasBlockedExtension) {
      // Special message for RAW files
      if (
        [".dng", ".cr2", ".cr3", ".nef", ".arw", ".orf", ".rw2"].includes(
          extension
        )
      ) {
        return {
          isValid: false,
          error: `File "${file.name}" is a RAW format (${extension.toUpperCase()}). RAW files are too large for web upload.\nPlease export as JPEG from your photo editing software.`,
        };
      }

      return {
        isValid: false,
        error: `File "${file.name}" has an unsupported format (${extension.toUpperCase()}). Please convert to JPEG, PNG, or WebP format.`,
      };
    }

    // Check file extension
    const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) =>
      fileName.endsWith(ext)
    );

    if (!hasValidExtension) {
      return {
        isValid: false,
        error: `File "${file.name}" has an unsupported extension (${extension.toUpperCase()}). Please use JPEG, PNG, WebP, or HEIC images.`,
      };
    }

    // Check MIME type (excluding HEIC since we handle it above)
    if (
      !ALLOWED_TYPES.includes(file.type) &&
      !file.type.includes("heic") &&
      !file.type.includes("heif")
    ) {
      return {
        isValid: false,
        error: `File "${file.name}" has an unsupported format. Please use JPEG, PNG, or WebP images.`,
      };
    }

    return { isValid: true };
  };

  // Handle file selection or drop with validation and conversion
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setOverallError(null);
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Show processing message for HEIC files
    const hasHeicFiles = fileArray.some((file) => {
      const fileName = file.name.toLowerCase();
      return fileName.endsWith(".heic") || fileName.endsWith(".heif");
    });

    // Show processing message for large files that need compression
    const hasLargeFiles = fileArray.some(
      (file) => file.size > COMPRESSION_THRESHOLD
    );

    if (hasHeicFiles && hasLargeFiles) {
      setOverallError("Converting HEIC files and compressing large images...");
    } else if (hasHeicFiles) {
      setOverallError("Converting HEIC files to JPEG...");
    } else if (hasLargeFiles) {
      setOverallError("Compressing large images...");
    }

    // Validate and convert each file
    for (const file of fileArray) {
      try {
        const validation = await validateFile(file);
        if (validation.isValid) {
          // Use converted file if available, otherwise use original
          validFiles.push(validation.convertedFile || file);
        } else {
          errors.push(validation.error!);
        }
      } catch (error) {
        errors.push(
          `Error processing "${file.name}": ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // Clear processing message
    if (hasHeicFiles || hasLargeFiles) {
      setOverallError(null);
    }

    // Show errors if any
    if (errors.length > 0) {
      const errorMessage =
        errors.length === 1
          ? errors[0]
          : `${errors.length} files were rejected:\n${errors.join("\n")}`;
      setOverallError(errorMessage);
      if (onError) onError(errorMessage);
    }

    // Set valid files for upload
    if (validFiles.length > 0) {
      setPendingFiles(validFiles);
      setProgress([]); // Reset progress if new files are selected
    } else if (errors.length > 0) {
      // If no valid files and there were errors, clear pending files
      setPendingFiles([]);
    }
  };

  // Start upload after confirmation
  const startUpload = async () => {
    if (pendingFiles.length === 0) return;
    setIsUploading(true);
    setOverallError(null);

    const fileProgress: FileProgress[] = pendingFiles.map((file) => ({
      file,
      percent: 0,
      status: "idle",
    }));
    setProgress(fileProgress);

    let completed = 0;
    const updatedProgress = [...fileProgress];
    const uploadedImages: UploadedImage[] = [];

    for (let i = 0; i < fileProgress.length; i++) {
      updatedProgress[i].status = "uploading";
      setProgress([...updatedProgress]);

      try {
        const uploadedImage = await uploadSingleFile(
          fileProgress[i].file,
          (percent) => {
            updatedProgress[i].percent = percent;
            setProgress([...updatedProgress]);
          }
        );

        uploadedImages.push(uploadedImage);
        updatedProgress[i].status = "complete";
        updatedProgress[i].percent = 100;
        setProgress([...updatedProgress]);
        completed++;
      } catch (err: any) {
        updatedProgress[i].status = "error";
        const errorMessage = err?.message || "Upload failed";
        updatedProgress[i].error = errorMessage;
        setProgress([...updatedProgress]);

        // Set overall error with more details
        const detailedError = `Upload failed for "${fileProgress[i].file.name}": ${errorMessage}`;
        setOverallError(detailedError);

        console.error(
          `[Upload] Error for "${fileProgress[i].file.name}":`,
          err
        );
        if (onError) onError(detailedError);
      }
    }

    setIsUploading(false);

    if (
      completed === fileProgress.length &&
      onImagesUploaded &&
      uploadedImages.length > 0
    ) {
      onImagesUploaded(uploadedImages);
    }

    setPendingFiles([]); // Clear pending files after upload
  };

  const uploadSingleFile = (
    file: File,
    onProgress: (percent: number) => void
  ): Promise<UploadedImage> => {
    return new Promise<UploadedImage>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("files", file);

      xhr.open("POST", "/api/images/upload");

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        console.log(`[Upload] Response status for "${file.name}":`, xhr.status);
        console.log(`[Upload] Response headers:`, xhr.getAllResponseHeaders());

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            console.log(`[Upload] Response for "${file.name}":`, result);

            if (result.success && result.images && result.images.length > 0) {
              onProgress(100);
              resolve(result.images[0]); // Return the first uploaded image
            } else if (result.errors && result.errors.length > 0) {
              // Handle API errors with detailed information
              const errorDetails = result.errors
                .map((err: any) => {
                  let details = err.error || "Unknown error";
                  if (err.details) details += `: ${err.details}`;
                  if (err.cloudflareStatus)
                    details += ` (Cloudflare ${err.cloudflareStatus})`;
                  return details;
                })
                .join("; ");

              console.error(
                `[Upload] API errors for "${file.name}":`,
                result.errors
              );
              reject(new Error(`Upload failed: ${errorDetails}`));
            } else {
              console.error(
                `[Upload] No images returned for "${file.name}":`,
                result
              );
              reject(new Error("No images returned from upload"));
            }
          } catch (parseError) {
            console.error(
              `[Upload] Failed to parse response for "${file.name}":`,
              parseError
            );
            console.error(`[Upload] Raw response:`, xhr.responseText);
            reject(
              new Error(
                `Failed to parse upload response: ${parseError instanceof Error ? parseError.message : "Unknown parse error"}`
              )
            );
          }
        } else {
          // Handle HTTP errors
          console.error(`[Upload] HTTP error for "${file.name}":`, {
            status: xhr.status,
            statusText: xhr.statusText,
            response: xhr.responseText,
          });

          try {
            const errorResult = JSON.parse(xhr.responseText);
            let errorMessage = `Upload failed (${xhr.status})`;
            if (errorResult.error) errorMessage += `: ${errorResult.error}`;
            if (errorResult.details)
              errorMessage += ` - ${errorResult.details}`;
            if (errorResult.timestamp)
              errorMessage += ` [${errorResult.timestamp}]`;
            reject(new Error(errorMessage));
          } catch {
            reject(
              new Error(
                `Upload failed: ${xhr.status} ${xhr.statusText} - ${xhr.responseText}`
              )
            );
          }
        }
      };

      xhr.onerror = () => {
        console.error(`[Upload] Network error for "${file.name}"`);
        reject(
          new Error(
            "Network error during upload - check your internet connection"
          )
        );
      };

      xhr.ontimeout = () => {
        console.error(`[Upload] Timeout error for "${file.name}"`);
        reject(
          new Error(
            "Upload timed out - file may be too large or connection too slow"
          )
        );
      };

      // Set a timeout (30 seconds)
      xhr.timeout = 30000;

      console.log(
        `[Upload] Starting upload for "${file.name}" (${file.size} bytes, ${file.type})`
      );
      xhr.send(formData);
    });
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleFiles(e.target.files);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    await handleFiles(e.dataTransfer.files);
  };

  const handleClick = () => {
    if (!isUploading) inputRef.current?.click();
  };

  // Calculate overall percent
  const overallPercent =
    progress.length > 0
      ? Math.floor(
          progress.reduce((acc, p) => acc + p.percent, 0) / progress.length
        )
      : 0;
  const allComplete =
    progress.length > 0 && progress.every((p) => p.status === "complete");

  // Remove a file from pending list
  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      {/* File select/drop UI, only if not uploading and no progress yet */}
      {progress.length === 0 && !isUploading && (
        <div
          className={cn(
            "border border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-background hover:bg-accent"
          )}
          tabIndex={0}
          role="button"
          aria-disabled={isUploading}
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          aria-label="Upload images"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
            multiple={multiple}
            className="hidden"
            onChange={handleInputChange}
            disabled={isUploading}
          />
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <div className="text-sm font-medium">
            Click to select or drag and drop images
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            JPEG, PNG, WebP, or HEIC images up to 4MB each
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Large images are automatically compressed • HEIC files converted to
            JPEG
          </div>
        </div>
      )}

      {/* Error display for file validation */}
      {overallError && progress.length === 0 && (
        <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="text-sm text-destructive font-medium mb-2">
            File Upload Issues:
          </div>
          <div className="text-xs text-destructive whitespace-pre-line break-words">
            {overallError}
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            <strong>Supported formats:</strong> JPEG, PNG, WebP, HEIC (up to 4MB
            each)
            <br />
            <strong>Auto-converted:</strong> HEIC and HEIF files are
            automatically converted to JPEG
            <br />
            <strong>Not supported:</strong> DNG, CR2, NEF, ARW, and other RAW
            formats
            <br />
            <strong>Note:</strong> HEIC conversion happens in your browser - no
            files are sent to servers during conversion
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            <strong>Debug Info:</strong> Check browser console for detailed logs
          </div>
        </div>
      )}

      {/* Enhanced error display during upload */}
      {overallError && progress.length > 0 && (
        <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="text-sm text-destructive font-medium mb-2">
            Upload Error:
          </div>
          <div className="text-xs text-destructive whitespace-pre-line break-words">
            {overallError}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            <strong>Timestamp:</strong> {new Date().toISOString()}
            <br />
            <strong>Debug:</strong> Check browser console for detailed error
            logs
            <br />
            <strong>Tip:</strong> Try uploading files one at a time to isolate
            the issue
          </div>
        </div>
      )}

      {/* Pending files list and confirm button */}
      {pendingFiles.length > 0 && progress.length === 0 && !isUploading && (
        <div className="mt-4 w-full">
          <div className="mb-2 font-medium">Files to upload:</div>
          <ul className="w-full max-w-[450px] overflow-hidden mb-4 divide-y divide-border rounded border border-border bg-background">
            {pendingFiles.map((file, i) => (
              <li
                key={i}
                className="flex items-center w-full max-w-full min-w-0 px-3 py-2 text-sm overflow-hidden"
              >
                <span className="truncate flex-1 min-w-0 max-w-full block whitespace-nowrap">
                  {file.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2 flex-shrink-0"
                  onClick={() => removePendingFile(i)}
                  aria-label={`Remove ${file.name}`}
                  disabled={isUploading}
                >
                  <XIcon className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
          <Button
            className="w-full"
            onClick={startUpload}
            disabled={isUploading || pendingFiles.length === 0}
          >
            Start Upload
          </Button>
        </div>
      )}

      {/* Progress UI */}
      {progress.length > 0 && (
        <div className="mt-4 w-full">
          <div
            className="relative w-full max-w-[450px] h-3 bg-secondary rounded-full overflow-hidden border border-border"
            role="progressbar"
            aria-valuenow={overallPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Overall upload progress"
          >
            <div
              className={cn(
                "absolute left-0 top-0 h-full transition-all duration-300",
                allComplete
                  ? "bg-green-500"
                  : overallPercent === 0
                    ? "bg-muted"
                    : "bg-primary"
              )}
              style={{ width: `${overallPercent}%` }}
            />
            {overallPercent > 0 && overallPercent < 100 && (
              <div
                className="absolute left-0 top-0 h-full w-full pointer-events-none"
                aria-hidden="true"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(135deg, rgba(255,255,255,0.08) 0 8px, transparent 8px 16px)",
                  width: `${overallPercent}%`,
                }}
              />
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1 text-center select-none">
            {overallPercent}% overall
          </div>
          <ul className="w-full max-w-[450px] overflow-hidden mt-2 space-y-2">
            {progress.map((p, i) => (
              <li
                key={i}
                className="flex flex-col w-full max-w-full min-w-0 px-3 py-2 text-sm overflow-hidden bg-background rounded border"
              >
                <div className="flex items-center w-full max-w-full min-w-0">
                  <span className="truncate flex-1 min-w-0 max-w-full block whitespace-nowrap">
                    {p.file.name}
                  </span>
                  <span className="ml-2 flex-shrink-0">
                    {p.status === "complete" && (
                      <span className="flex items-center gap-1 text-green-600">
                        <Check className="w-4 h-4" /> Done
                      </span>
                    )}
                    {p.status === "error" && (
                      <span className="flex items-center gap-1 text-destructive">
                        <XIcon className="w-4 h-4" /> Error
                      </span>
                    )}
                    {p.status === "uploading" && (
                      <span className="flex items-center gap-1 text-primary">
                        <Loader2 className="w-4 h-4 animate-spin" /> {p.percent}
                        %
                      </span>
                    )}
                    {p.status === "idle" && <span>Waiting</span>}
                  </span>
                </div>
                {p.status === "error" && p.error && (
                  <div className="mt-2 text-xs text-destructive break-words">
                    <strong>Error:</strong> {p.error}
                  </div>
                )}
              </li>
            ))}
          </ul>
          {overallError && (
            <div className="text-xs text-destructive mt-2 text-center">
              {overallError}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InspectionImageUpload;
