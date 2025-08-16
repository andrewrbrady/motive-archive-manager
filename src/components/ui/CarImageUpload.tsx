import React from "react";
import UnifiedImageUploader from "@/components/UnifiedImageUploader";

interface CarImageUploadProps {
  carId: string;
  vehicleInfo?: any;
  onComplete?: () => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  multiple?: boolean;
}

const CarImageUpload: React.FC<CarImageUploadProps> = ({
  carId,
  vehicleInfo,
  onComplete,
  onError,
  onCancel,
  multiple = true,
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
