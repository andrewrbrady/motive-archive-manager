import React from "react";
import UnifiedImageUploader, {
  type UnifiedUploadProgress,
} from "@/components/UnifiedImageUploader";

interface CarImageUploadProps {
  carId: string;
  vehicleInfo?: any;
  onComplete?: () => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  multiple?: boolean;
  onProgress?: (progress: UnifiedUploadProgress[]) => void;
}

const CarImageUpload: React.FC<CarImageUploadProps> = ({
  carId,
  vehicleInfo,
  onComplete,
  onError,
  onCancel,
  multiple = true,
  onProgress,
}) => {
  console.log(
    "🚗 CarImageUpload using UNIFIED uploader with PARALLEL processing:",
    { carId }
  );

  return (
    <UnifiedImageUploader
      context="car"
      carId={carId}
      vehicleInfo={vehicleInfo}
      metadata={{ vehicleInfo }}
      onProgress={onProgress}
      onComplete={onComplete}
      onError={onError}
      onCancel={onCancel}
      maxFiles={multiple ? Infinity : 1}
      showDropzone={true}
      showAnalysisOptions={true}
    />
  );
};

export default CarImageUpload;
