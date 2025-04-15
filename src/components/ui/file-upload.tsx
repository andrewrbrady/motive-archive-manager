"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useDropzone } from "react-dropzone";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";

interface FileUploadProps {
  maxFiles?: number;
  maxSize?: number;
  accept?: string;
  onUpload: (
    files: File[],
    options: {
      onProgress: (file: File, progress: number) => void;
      onSuccess: (file: File) => void;
      onError: (file: File, error: Error) => void;
    }
  ) => Promise<void>;
  className?: string;
  children?: React.ReactNode;
}

interface FileUploadContextValue {
  files: File[];
  progress: Record<string, number>;
  status: Record<string, "uploading" | "complete" | "error">;
  errors: Record<string, string>;
  removeFile: (file: File) => void;
  handleUpload: () => Promise<void>;
  addFiles: (files: File[]) => void;
  pendingFiles: File[];
}

const FileUploadContext = React.createContext<FileUploadContextValue | null>(
  null
);

export const Root: React.FC<FileUploadProps> = ({
  maxFiles = 10,
  maxSize = 5 * 1024 * 1024, // 5MB default
  accept = "image/*",
  onUpload,
  className,
  children,
}) => {
  const [files, setFiles] = React.useState<File[]>([]);
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const [progress, setProgress] = React.useState<Record<string, number>>({});
  const [status, setStatus] = React.useState<
    Record<string, "uploading" | "complete" | "error">
  >({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const addFiles = React.useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.slice(0, maxFiles - files.length);
      if (newFiles.length === 0) return;
      setPendingFiles((prev) => [...prev, ...newFiles]);
    },
    [files.length, maxFiles]
  );

  const handleUpload = React.useCallback(async () => {
    if (pendingFiles.length === 0) return;

    setFiles((prev) => [...prev, ...pendingFiles]);

    // Initialize progress and status for new files
    pendingFiles.forEach((file) => {
      setProgress((prev) => ({ ...prev, [file.name]: 0 }));
      setStatus((prev) => ({ ...prev, [file.name]: "uploading" }));
    });

    try {
      await onUpload(pendingFiles, {
        onProgress: (file, value) => {
          setProgress((prev) => ({ ...prev, [file.name]: value }));
        },
        onSuccess: (file) => {
          setStatus((prev) => ({ ...prev, [file.name]: "complete" }));
        },
        onError: (file, error) => {
          setStatus((prev) => ({ ...prev, [file.name]: "error" }));
          setErrors((prev) => ({ ...prev, [file.name]: error.message }));
        },
      });
      setPendingFiles([]); // Clear pending files after successful upload
    } catch (error) {
      console.error("Upload error:", error);
    }
  }, [pendingFiles, onUpload]);

  const removeFile = React.useCallback((file: File) => {
    setPendingFiles((prev) => prev.filter((f) => f !== file));
    setFiles((prev) => prev.filter((f) => f !== file));
    setProgress((prev) => {
      const newProgress = { ...prev };
      delete newProgress[file.name];
      return newProgress;
    });
    setStatus((prev) => {
      const newStatus = { ...prev };
      delete newStatus[file.name];
      return newStatus;
    });
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[file.name];
      return newErrors;
    });
  }, []);

  const value = React.useMemo(
    () => ({
      files,
      progress,
      status,
      errors,
      removeFile,
      handleUpload,
      addFiles,
      pendingFiles,
    }),
    [
      files,
      progress,
      status,
      errors,
      removeFile,
      handleUpload,
      addFiles,
      pendingFiles,
    ]
  );

  return (
    <FileUploadContext.Provider value={value}>
      <div className={cn("space-y-4", className)}>{children}</div>
    </FileUploadContext.Provider>
  );
};

export const Dropzone: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  const context = React.useContext(FileUploadContext);
  if (!context) throw new Error("Dropzone must be used within FileUpload");

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      if (!context) return;
      context.addFiles(acceptedFiles);
    },
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "cursor-pointer rounded-lg border-2 border-dashed border-border/40 bg-muted/50 p-6 transition-colors",
        isDragActive && "border-primary bg-primary/5",
        className
      )}
      {...props}
    >
      <input {...getInputProps()} />
      {children}
    </div>
  );
};

export const List: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const context = React.useContext(FileUploadContext);
  if (!context) throw new Error("List must be used within FileUpload");

  if (context.pendingFiles.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className={cn("space-y-2 pr-2", className)} {...props}>
        {context.pendingFiles.map((file) => (
          <Item key={file.name} file={file} />
        ))}
      </div>
      <div className="flex justify-end pt-2 border-t border-border/40">
        <Button
          onClick={() => context.handleUpload()}
          disabled={context.pendingFiles.length === 0}
        >
          Upload {context.pendingFiles.length} file
          {context.pendingFiles.length !== 1 ? "s" : ""}
        </Button>
      </div>
    </div>
  );
};

interface ItemProps extends React.HTMLAttributes<HTMLDivElement> {
  file: File;
}

export const Item: React.FC<ItemProps> = ({ file, className, ...props }) => {
  const context = React.useContext(FileUploadContext);
  if (!context) throw new Error("Item must be used within FileUpload");

  const progress = context.progress[file.name] || 0;
  const status = context.status[file.name];

  return (
    <div
      className={cn(
        "rounded-lg border border-border/40 bg-muted/50 p-3",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{file.name}</div>
          <div className="text-xs text-muted-foreground">
            {(file.size / 1024).toFixed(1)} KB
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === "error" && (
            <div className="text-xs text-destructive">
              {context.errors[file.name]}
            </div>
          )}
          {status === "uploading" && (
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {Math.round(progress)}%
            </div>
          )}
          {status === "complete" && (
            <div className="text-xs text-green-500">Complete</div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => context.removeFile(file)}
            className="h-6 w-6 hover:bg-background/80"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove file</span>
          </Button>
        </div>
      </div>
      {status === "uploading" && (
        <div className="mt-2">
          <Progress value={progress} className="h-1" />
        </div>
      )}
    </div>
  );
};

export const ItemPreview: React.FC = () => {
  const context = React.useContext(FileUploadContext);
  if (!context) throw new Error("ItemPreview must be used within FileUpload");

  return null; // Implement preview if needed
};

export const ItemMetadata: React.FC = () => {
  const context = React.useContext(FileUploadContext);
  if (!context) throw new Error("ItemMetadata must be used within FileUpload");

  return null; // Implement metadata if needed
};

export const ItemProgress: React.FC = () => {
  const context = React.useContext(FileUploadContext);
  if (!context) throw new Error("ItemProgress must be used within FileUpload");

  return null; // Progress is implemented in Item component
};

export const ItemDelete: React.FC = () => {
  const context = React.useContext(FileUploadContext);
  if (!context) throw new Error("ItemDelete must be used within FileUpload");

  return null; // Delete button is implemented in Item component
};

// Remove unused components
export { type FileUploadProps };
