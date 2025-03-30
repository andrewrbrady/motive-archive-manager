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
        return <Check className="h-3.5 w-3.5 text-success" />;
      case "error":
        return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
      case "uploading":
        return (
          <UploadCloud className="h-3.5 w-3.5 text-primary animate-pulse" />
        );
      default:
        return <Cloud className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getOpenAIIcon = () => {
    const aiStatus = stepProgress?.openai?.status || "pending";
    switch (aiStatus) {
      case "complete":
        return <Check className="h-3.5 w-3.5 text-success" />;
      case "error":
        return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
      case "analyzing":
        return <Brain className="h-3.5 w-3.5 text-primary animate-pulse" />;
      default:
        return <Brain className="h-3.5 w-3.5 text-muted-foreground" />;
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
      className={`mb-2 border rounded-md p-2 ${getStatusColor()} transition-all duration-300`}
    >
      <div className="flex items-center justify-between mb-1">
        <h4
          className="font-medium text-xs truncate flex items-center gap-1"
          title={fileName}
        >
          {status === "uploading" && (
            <Loader2 className="w-3 h-3 animate-spin" />
          )}
          {status === "complete" && <Check className="w-3 h-3" />}
          {status === "error" && <AlertCircle className="w-3 h-3" />}
          {fileName}
        </h4>
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-background border border-current text-[10px]">
          {status === "error"
            ? "Failed"
            : status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      {/* Overall progress */}
      <Progress
        value={progress.progress}
        className={`h-1 mb-2 ${
          status === "error" ? "bg-destructive/20" : "bg-primary/20"
        }`}
      />

      {/* Detailed step progress */}
      {stepProgress && (
        <div className="grid grid-cols-1 gap-1 text-xs mt-1 pt-1 border-t border-current/10">
          {/* Cloudflare progress */}
          {stepProgress.cloudflare && (
            <div className="flex items-start gap-1.5">
              <div className="flex-shrink-0 mt-0.5">{getCloudflareIcon()}</div>
              <div className="flex-grow">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-[10px]">
                    Cloudflare Upload
                  </span>
                  <span className="text-[10px] opacity-80">
                    {stepProgress.cloudflare.progress}%
                  </span>
                </div>
                <Progress
                  value={stepProgress.cloudflare.progress}
                  className="h-1 mt-0.5 bg-current/10"
                />
                <p className="text-[10px] opacity-80 mt-0.5 line-clamp-1">
                  {stepProgress.cloudflare.message ||
                    "Uploading to Cloudflare..."}
                </p>
              </div>
            </div>
          )}

          {/* OpenAI progress */}
          {stepProgress.openai && (
            <div className="flex items-start gap-1.5">
              <div className="flex-shrink-0 mt-0.5">{getOpenAIIcon()}</div>
              <div className="flex-grow">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-[10px]">AI Analysis</span>
                  <span className="text-[10px] opacity-80">
                    {stepProgress.openai.progress}%
                  </span>
                </div>
                <Progress
                  value={stepProgress.openai.progress}
                  className="h-1 mt-0.5 bg-current/10"
                />
                <p className="text-[10px] opacity-80 mt-0.5 line-clamp-1">
                  {stepProgress.openai.message || "Analyzing with AI..."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {progress.error && (
        <div className="mt-1 text-[10px] flex items-center gap-1 p-1.5 rounded bg-destructive/10 text-destructive">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span className="flex-grow line-clamp-2">{progress.error}</span>
        </div>
      )}
    </div>
  );
}

export function ProgressList({ items }: { items: ProgressItem[] }) {
  if (!items.length) return null;

  return (
    <div className="space-y-2 my-2">
      <h3 className="font-medium text-xs">
        Upload Progress ({items.length} files)
      </h3>
      {items.map((item, index) => (
        <ProgressTracker key={index} progress={item} />
      ))}
    </div>
  );
}
