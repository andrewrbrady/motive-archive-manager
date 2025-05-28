import React from "react";
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
import { Upload, Plus } from "lucide-react";
import CarImageUpload from "@/components/ui/CarImageUpload";

interface UploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  carId: string;
  vehicleInfo?: any;
  onComplete: () => void;
  showAsEmptyState?: boolean;
  showAsButton?: boolean;
}

export function UploadDialog({
  isOpen,
  onOpenChange,
  carId,
  vehicleInfo,
  onComplete,
  showAsEmptyState = false,
  showAsButton = false,
}: UploadDialogProps) {
  const handleUploadError = () => {
    // Error handling is done in CarImageUpload component
  };

  // Empty state display
  if (showAsEmptyState) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Upload className="w-12 h-12 text-muted-foreground" />
        <p className="text-lg font-medium">No images yet</p>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Upload Images
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Upload Images</DialogTitle>
              <DialogDescription>
                Upload images for this car. They will be automatically assigned
                to {vehicleInfo?.year} {vehicleInfo?.make} {vehicleInfo?.model}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <CarImageUpload
                carId={carId}
                vehicleInfo={vehicleInfo}
                onComplete={onComplete}
                onError={handleUploadError}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
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
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Upload Images
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Upload Images</DialogTitle>
            <DialogDescription>
              Upload images for this car. They will be automatically assigned to{" "}
              {vehicleInfo?.year} {vehicleInfo?.make} {vehicleInfo?.model}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <CarImageUpload
              carId={carId}
              vehicleInfo={vehicleInfo}
              onComplete={onComplete}
              onError={handleUploadError}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Regular dialog (controlled externally)
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Images</DialogTitle>
          <DialogDescription>
            Upload images for this car. They will be automatically assigned to{" "}
            {vehicleInfo?.year} {vehicleInfo?.make} {vehicleInfo?.model}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <CarImageUpload
            carId={carId}
            vehicleInfo={vehicleInfo}
            onComplete={onComplete}
            onError={handleUploadError}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
