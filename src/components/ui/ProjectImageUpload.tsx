import React from "react";
import UnifiedImageUploader from "@/components/UnifiedImageUploader";

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
  const projectMetadata = {
    projectId,
    projectInfo: projectInfo ? JSON.stringify(projectInfo) : undefined,
    category: "project",
    analysisContext: "project_image",
    imageContext:
      "Project image that could be event photography, marketing content, behind-the-scenes shots, team photos, or project deliverables",
    preferredPromptCategory: "project",
  };

  return (
    <UnifiedImageUploader
      context="project"
      projectId={projectId}
      metadata={projectMetadata}
      maxFiles={multiple ? Infinity : 1}
      onComplete={onComplete}
      onError={onError}
      onCancel={onCancel}
      showDropzone={true}
      showAnalysisOptions={true}
    />
  );
};

export default ProjectImageUpload;
