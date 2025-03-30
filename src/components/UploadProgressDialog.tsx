"use client";

import { Dialog } from "@headlessui/react";
import { Progress } from "@/components/ui/progress";
import { Brain, Check, AlertCircle, UploadCloud, Cloud } from "lucide-react";

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "analyzing" | "complete" | "error";
  error?: string;
  currentStep?: string;
  stepProgress?: {
    cloudflare: {
      status: "pending" | "uploading" | "complete" | "error";
      progress: number;
      message?: string;
    };
    openai: {
      status: "pending" | "analyzing" | "complete" | "error";
      progress: number;
      message?: string;
    };
  };
}

interface UploadProgressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  uploadProgress: UploadProgress[];
}

export function UploadProgressDialog({
  isOpen,
  onClose,
  uploadProgress,
}: UploadProgressDialogProps) {
  const isComplete = uploadProgress.every((p) => {
    // Check both the overall status and the individual step statuses
    return (
      p.status === "complete" &&
      (p.stepProgress
        ? p.stepProgress.cloudflare.status === "complete" &&
          p.stepProgress.openai.status === "complete"
        : true) // If no stepProgress, fall back to just checking p.status
    );
  });

  const hasError = uploadProgress.some(
    (p) =>
      p.status === "error" ||
      p.stepProgress?.cloudflare.status === "error" ||
      p.stepProgress?.openai.status === "error"
  );

  const getCloudflareIcon = (progress: UploadProgress) => {
    switch (progress.stepProgress?.cloudflare.status) {
      case "complete":
        return <Check className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "uploading":
        return <UploadCloud className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <Cloud className="h-4 w-4 text-gray-500" />;
    }
  };

  const getOpenAIIcon = (progress: UploadProgress) => {
    switch (progress.stepProgress?.openai.status) {
      case "complete":
        return <Check className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "analyzing":
        return <Brain className="h-4 w-4 text-purple-500 animate-pulse" />;
      default:
        return <Brain className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        aria-hidden="true"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-sm w-full bg-background border border-border rounded-lg p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold mb-4 text-foreground">
            Uploading Images
          </Dialog.Title>

          <div className="space-y-4">
            {uploadProgress.map((progress) => (
              <div key={progress.fileName} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground">{progress.fileName}</span>
                  <span className="text-foreground-muted">
                    {progress.status === "complete"
                      ? "Complete"
                      : progress.status === "error"
                      ? "Error"
                      : `${Math.round(progress.progress)}%`}
                  </span>
                </div>
                <Progress value={progress.progress} />

                {/* Step progress indicators */}
                {progress.stepProgress && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        {getCloudflareIcon(progress)}
                        <span>Cloudflare Upload</span>
                      </div>
                      <span className="text-foreground-muted">
                        {progress.stepProgress.cloudflare.message ||
                          (progress.stepProgress.cloudflare.status ===
                          "complete"
                            ? "Complete"
                            : progress.stepProgress.cloudflare.status ===
                              "error"
                            ? "Error"
                            : progress.stepProgress.cloudflare.status ===
                              "uploading"
                            ? "Uploading..."
                            : "Pending")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        {getOpenAIIcon(progress)}
                        <span>AI Analysis</span>
                      </div>
                      <span className="text-foreground-muted">
                        {progress.stepProgress.openai.message ||
                          (progress.stepProgress.openai.status === "complete"
                            ? "Complete"
                            : progress.stepProgress.openai.status === "error"
                            ? "Error"
                            : progress.stepProgress.openai.status ===
                              "analyzing"
                            ? "Analyzing..."
                            : "Pending")}
                      </span>
                    </div>
                  </div>
                )}

                {progress.error && (
                  <p className="text-sm text-destructive">{progress.error}</p>
                )}
                {progress.currentStep && (
                  <p className="text-sm text-foreground-muted">
                    {progress.currentStep}
                  </p>
                )}
              </div>
            ))}
          </div>

          {(isComplete || hasError) && (
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-medium text-foreground hover:text-foreground-hover"
              >
                Close
              </button>
            </div>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
