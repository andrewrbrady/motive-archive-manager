import React from "react";
import { Info, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UploadLimitsInfoProps {
  variant?: "info" | "warning";
  showTroubleshooting?: boolean;
}

export function UploadLimitsInfo({
  variant = "info",
  showTroubleshooting = false,
}: UploadLimitsInfoProps) {
  const Icon = variant === "warning" ? AlertCircle : Info;

  return (
    <Alert className="mb-4">
      <Icon className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-2">
          <div className="font-medium">Upload Limits:</div>
          <ul className="text-sm space-y-1 ml-4">
            <li>• Maximum 8MB per image</li>
            <li>• Maximum 25MB total per batch</li>
            <li>• Recommended: Upload 5-10 images at a time</li>
          </ul>

          {showTroubleshooting && (
            <div className="mt-3 pt-2 border-t">
              <div className="font-medium text-sm">
                If you get "Content Too Large" errors:
              </div>
              <ul className="text-sm space-y-1 ml-4 mt-1">
                <li>• Reduce image file sizes (compress images)</li>
                <li>• Upload fewer images at once</li>
                <li>
                  • Try uploading one image at a time for very large files
                </li>
              </ul>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
