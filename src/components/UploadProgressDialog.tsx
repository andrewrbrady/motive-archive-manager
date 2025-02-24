"use client";

import { Dialog } from "@headlessui/react";
import { Progress } from "@/components/ui/progress";

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "analyzing" | "complete" | "error";
  error?: string;
  currentStep?: string;
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
  const isComplete = uploadProgress.every((p) => p.status === "complete");
  const hasError = uploadProgress.some((p) => p.status === "error");

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
