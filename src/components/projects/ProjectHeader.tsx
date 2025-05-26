"use client";

import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/PageTitle";
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
    <PageTitle title={project.title}>
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
  );
}
