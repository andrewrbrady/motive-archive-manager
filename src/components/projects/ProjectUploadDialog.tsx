import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, Plus, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ProjectImageUpload from "@/components/ui/ProjectImageUpload";

interface ProjectUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectInfo?: any;
  onComplete: () => void;
  showAsEmptyState?: boolean;
  showAsButton?: boolean;
}

export function ProjectUploadDialog({
  isOpen,
  onOpenChange,
  projectId,
  projectInfo,
  onComplete,
  showAsEmptyState = false,
  showAsButton = false,
}: ProjectUploadDialogProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUploadError = (error: string) => {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Upload error:", error);
    setUploadError(error);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setUploadError(null); // Clear error when dialog closes
    }
    onOpenChange(open);
  };

  // Empty state display
  if (showAsEmptyState) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Upload className="w-12 h-12 text-muted-foreground" />
        <p className="text-lg font-medium">No images yet</p>
        <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Upload Images
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Upload Project Images</DialogTitle>
              <DialogDescription>
                Upload images for this project. These could be event photos,
                marketing images, behind-the-scenes shots, or project
                deliverables.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4">
              {uploadError && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}
              <ProjectImageUpload
                projectId={projectId}
                projectInfo={projectInfo}
                onComplete={onComplete}
                onError={handleUploadError}
                onCancel={() => handleDialogOpenChange(false)}
              />
            </div>
            <DialogFooter className="flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Button-only display
  if (showAsButton) {
    return (
      <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Upload Images
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Upload Project Images</DialogTitle>
            <DialogDescription>
              Upload images for this project. These could be event photos,
              marketing images, behind-the-scenes shots, or project
              deliverables.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {uploadError && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}
            <ProjectImageUpload
              projectId={projectId}
              projectInfo={projectInfo}
              onComplete={() => {
                onComplete();
                handleDialogOpenChange(false);
              }}
              onError={handleUploadError}
              onCancel={() => handleDialogOpenChange(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Regular dialog (controlled externally)
  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Project Images</DialogTitle>
          <DialogDescription>
            Upload images for this project. These could be event photos,
            marketing images, behind-the-scenes shots, or project deliverables.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4">
          {uploadError && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}
          <ProjectImageUpload
            projectId={projectId}
            projectInfo={projectInfo}
            onComplete={onComplete}
            onError={handleUploadError}
            onCancel={() => handleDialogOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
