import React from "react";
import ImageUploader from "./ImageUploader";

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
  console.log("🚗 CarImageUpload rendering with:", { carId, mode: "car" });

  return (
    <ImageUploader
      mode="car"
      carId={carId}
      vehicleInfo={vehicleInfo}
      onComplete={onComplete}
      onError={onError}
      onCancel={onCancel}
      multiple={multiple}
    />
  );
};

export default CarImageUpload;
