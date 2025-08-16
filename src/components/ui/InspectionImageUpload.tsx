import React from "react";
import UnifiedImageUploader from "@/components/UnifiedImageUploader";

interface UploadedImage {
  id: string;
  cloudflareId: string;
  url: string;
}

interface InspectionImageUploadProps {
  onImagesUploaded: (images: UploadedImage[]) => void;
  onError?: (error: string) => void;
  multiple?: boolean;
}

const InspectionImageUpload: React.FC<InspectionImageUploadProps> = ({
  onImagesUploaded,
  onError,
  multiple = true,
}) => {
  console.log(
    "🔍 InspectionImageUpload using UNIFIED uploader with PARALLEL processing"
  );

  const handleUploadComplete = (results: { url: string; metadata?: any }[]) => {
    const uploadedImages: UploadedImage[] = results.map((result) => ({
      id:
        result.url.split("/").pop() ||
        Math.random().toString(36).substring(2, 15),
      cloudflareId: result.url.split("/").pop() || "",
      url: result.url,
    }));

    onImagesUploaded(uploadedImages);
  };

  return (
    <UnifiedImageUploader
      context="inspection"
      onUploadComplete={handleUploadComplete}
      onError={onError}
      maxFiles={multiple ? Infinity : 1}
      showDropzone={true}
      showAnalysisOptions={false} // Inspections might not need full analysis options
    />
  );
};

export default InspectionImageUpload;
