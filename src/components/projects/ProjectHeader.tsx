"use client";

import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/PageTitle";
import { ProjectAvatar } from "@/components/ui/ProjectAvatar";
import { ArrowLeft, Settings } from "lucide-react";
import { Project, ProjectStatus } from "@/types/project";
import { useRouter } from "next/navigation";

interface ProjectHeaderProps {
  project: Project;
  onStatusChange: (status: ProjectStatus) => void;
  onBack: () => void;
}

export function ProjectHeader({
  project,
  onStatusChange,
  onBack,
}: ProjectHeaderProps) {
  const router = useRouter();

  const handleSettingsClick = () => {
    router.push(`/projects/${project._id}/settings`);
  };

  return (
    <div className="flex items-center gap-4 mb-6">
      <ProjectAvatar
        primaryImageId={project.primaryImageId}
        entityName={project.title}
      />
      <PageTitle title={project.title} className="">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSettingsClick}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Button
            variant="outline"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        </div>
      </PageTitle>
    </div>
  );
}
