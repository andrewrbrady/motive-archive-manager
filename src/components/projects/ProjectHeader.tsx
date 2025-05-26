"use client";

import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/PageTitle";
import { ArrowLeft } from "lucide-react";
import { Project, ProjectStatus } from "@/types/project";

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
  return (
    <PageTitle title={project.title}>
      <Button
        variant="outline"
        onClick={onBack}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Button>
    </PageTitle>
  );
}
