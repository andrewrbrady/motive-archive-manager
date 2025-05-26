"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, CheckCircle, Users, AlertCircle } from "lucide-react";
import { Project } from "@/types/project";

interface ProjectProgressCardsProps {
  project: Project;
}

export function ProjectProgressCards({ project }: ProjectProgressCardsProps) {
  const getCompletedMilestones = () => {
    return project.timeline.milestones.filter((m) => m.completed).length;
  };

  const getOverdueMilestones = () => {
    const today = new Date();
    return project.timeline.milestones.filter(
      (m) => !m.completed && new Date(m.dueDate) < today
    ).length;
  };

  const completedMilestones = getCompletedMilestones();
  const overdueMilestones = getOverdueMilestones();

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-2xl font-bold">
                {project.progress.percentage}%
              </p>
            </div>
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
          <Progress value={project.progress.percentage} className="mt-2" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Milestones</p>
              <p className="text-2xl font-bold">
                {completedMilestones}/{project.timeline.milestones.length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Team Members</p>
              <p className="text-2xl font-bold">{project.members.length}</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold text-red-600">
                {overdueMilestones}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
