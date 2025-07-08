import React from "react";
import ImageUploader from "./ImageUploader";

interface ProjectImageUploadProps {
  projectId: string;
  projectInfo?: any;
  onComplete?: () => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  multiple?: boolean;
}

const ProjectImageUpload: React.FC<ProjectImageUploadProps> = ({
  projectId,
  projectInfo,
  onComplete,
  onError,
  onCancel,
  multiple = true,
}) => {
  console.log("🚀 ProjectImageUpload rendering with:", {
    projectId,
    mode: "general",
  });

  // Create metadata for project images that can handle different types
  const projectMetadata = {
    projectId,
    projectInfo: projectInfo ? JSON.stringify(projectInfo) : undefined,
    // Default category for projects - will be refined by AI analysis
    category: "project",
    // Context for AI analysis
    analysisContext: "project_image",
    // This helps the AI understand it's analyzing project images which could be
    // event photos, marketing images, behind-the-scenes content, etc.
    imageContext:
      "Project image that could be event photography, marketing content, behind-the-scenes shots, team photos, or project deliverables",
    // Specify we want to use the project-specific analysis prompt
    preferredPromptCategory: "project",
  };

  return (
    <ImageUploader
      mode="general" // Use general mode for project images
      metadata={projectMetadata}
      onComplete={onComplete}
      onError={onError}
      onCancel={onCancel}
      multiple={multiple}
    />
  );
};

export default ProjectImageUpload;
