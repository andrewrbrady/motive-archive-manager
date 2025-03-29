import React from "react";
import { Progress } from "@/components/ui/progress";
import {
  Cloud,
  AlertCircle,
  Brain,
  Check,
  UploadCloud,
  Loader2,
} from "lucide-react";

// Generic progress interface that works with all our existing components
export interface ProgressItem {
  fileName: string;
  progress: number;
  status: string;
  error?: string;
  currentStep?: string;
  imageUrl?: string;
  metadata?: any;
  stepProgress?: {
    cloudflare?: {
      status: string;
      progress: number;
      message?: string;
    };
    openai?: {
      status: string;
      progress: number;
      message?: string;
    };
  };
}

interface ProgressTrackerProps {
  progress: ProgressItem;
}

export function ProgressTracker({ progress }: ProgressTrackerProps) {
  const { status, fileName, currentStep, stepProgress } = progress;

  const getCloudflareIcon = () => {
    const cloudStatus = stepProgress?.cloudflare?.status || "pending";
    switch (cloudStatus) {
      case "complete":
        return <Check className="h-4 w-4 text-success" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "uploading":
        return <UploadCloud className="h-4 w-4 text-primary animate-pulse" />;
      default:
        return <Cloud className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getOpenAIIcon = () => {
    const aiStatus = stepProgress?.openai?.status || "pending";
    switch (aiStatus) {
      case "complete":
        return <Check className="h-4 w-4 text-success" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "analyzing":
        return <Brain className="h-4 w-4 text-primary animate-pulse" />;
      default:
        return <Brain className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "complete":
        return "bg-success/15 text-success border-success/30";
      case "error":
        return "bg-destructive/15 text-destructive border-destructive/30";
      case "uploading":
      case "processing":
        return "bg-primary/15 text-primary border-primary/30";
      case "analyzing":
        return "bg-secondary/15 text-secondary border-secondary/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div
      className={`mb-3 border rounded-md p-3 ${getStatusColor()} transition-all duration-300`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4
          className="font-medium text-sm truncate flex items-center gap-1.5"
          title={fileName}
        >
          {status === "uploading" && (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          )}
          {status === "complete" && <Check className="w-3.5 h-3.5" />}
          {status === "error" && <AlertCircle className="w-3.5 h-3.5" />}
          {fileName}
        </h4>
        <span className="text-xs px-2 py-0.5 rounded-full bg-background border border-current">
          {status === "error"
            ? "Failed"
            : status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      {/* Overall progress */}
      <Progress
        value={progress.progress}
        className={`h-1.5 mb-3 ${
          status === "error" ? "bg-destructive/20" : "bg-primary/20"
        }`}
      />

      {/* Detailed step progress */}
      {stepProgress && (
        <div className="grid grid-cols-1 gap-2 text-sm mt-2 pt-2 border-t border-current/10">
          {/* Cloudflare progress */}
          {stepProgress.cloudflare && (
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">{getCloudflareIcon()}</div>
              <div className="flex-grow">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-xs">Cloudflare Upload</span>
                  <span className="text-xs opacity-80">
                    {stepProgress.cloudflare.progress}%
                  </span>
                </div>
                <Progress
                  value={stepProgress.cloudflare.progress}
                  className="h-1 mt-1 bg-current/10"
                />
                <p className="text-xs opacity-80 mt-0.5">
                  {stepProgress.cloudflare.message ||
                    "Uploading to Cloudflare..."}
                </p>
              </div>
            </div>
          )}

          {/* OpenAI progress */}
          {stepProgress.openai && (
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">{getOpenAIIcon()}</div>
              <div className="flex-grow">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-xs">AI Analysis</span>
                  <span className="text-xs opacity-80">
                    {stepProgress.openai.progress}%
                  </span>
                </div>
                <Progress
                  value={stepProgress.openai.progress}
                  className="h-1 mt-1 bg-current/10"
                />
                <p className="text-xs opacity-80 mt-0.5">
                  {stepProgress.openai.message || "Analyzing with AI..."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {progress.error && (
        <div className="mt-2 text-xs flex items-center gap-1.5 p-2 rounded bg-destructive/10 text-destructive">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="flex-grow">{progress.error}</span>
        </div>
      )}
    </div>
  );
}

export function ProgressList({ items }: { items: ProgressItem[] }) {
  if (!items.length) return null;

  return (
    <div className="space-y-3 my-4">
      <h3 className="font-medium text-sm">
        Upload Progress ({items.length} files)
      </h3>
      {items.map((item, index) => (
        <ProgressTracker key={index} progress={item} />
      ))}
    </div>
  );
}
