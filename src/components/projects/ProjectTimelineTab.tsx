"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  Circle,
  Target,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { Project, ProjectMilestone } from "@/types/project";
import { toast } from "@/components/ui/use-toast";

interface ProjectTimelineTabProps {
  project: Project;
  onProjectUpdate: () => void;
}

export function ProjectTimelineTab({
  project,
  onProjectUpdate,
}: ProjectTimelineTabProps) {
  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] =
    useState<ProjectMilestone | null>(null);
  const [milestoneForm, setMilestoneForm] = useState({
    title: "",
    description: "",
    dueDate: new Date(),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const handleToggleMilestone = async (
    milestoneId: string,
    completed: boolean
  ) => {
    try {
      const response = await fetch(`/api/projects/${project._id}/timeline`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          milestones: project.timeline.milestones.map((m) =>
            m.id === milestoneId
              ? {
                  ...m,
                  completed,
                  completedAt: completed ? new Date().toISOString() : undefined,
                }
              : m
          ),
        }),
      });

      if (!response.ok) throw new Error("Failed to update milestone");

      // Refresh project data
      await onProjectUpdate();

      toast({
        title: "Success",
        description: `Milestone ${completed ? "completed" : "reopened"} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update milestone",
        variant: "destructive",
      });
    }
  };

  const handleAddMilestone = async () => {
    if (!milestoneForm.title.trim()) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/projects/${project._id}/timeline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: milestoneForm.title,
          description: milestoneForm.description,
          dueDate: milestoneForm.dueDate.toISOString(),
          assignedTo: [],
        }),
      });

      if (!response.ok) throw new Error("Failed to add milestone");

      // Refresh project data
      await onProjectUpdate();

      // Reset form and close modal
      setMilestoneForm({
        title: "",
        description: "",
        dueDate: new Date(),
      });
      setIsAddMilestoneOpen(false);

      toast({
        title: "Success",
        description: "Milestone added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add milestone",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditMilestone = (milestone: ProjectMilestone) => {
    setEditingMilestone(milestone);
    setMilestoneForm({
      title: milestone.title,
      description: milestone.description || "",
      dueDate: new Date(milestone.dueDate),
    });
    setIsAddMilestoneOpen(true);
  };

  const handleUpdateMilestone = async () => {
    if (!editingMilestone || !milestoneForm.title.trim()) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/projects/${project._id}/timeline`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          milestones: project.timeline.milestones.map((m) =>
            m.id === editingMilestone.id
              ? {
                  ...m,
                  title: milestoneForm.title,
                  description: milestoneForm.description,
                  dueDate: milestoneForm.dueDate.toISOString(),
                }
              : m
          ),
        }),
      });

      if (!response.ok) throw new Error("Failed to update milestone");

      // Refresh project data
      await onProjectUpdate();

      // Reset form and close modal
      setMilestoneForm({
        title: "",
        description: "",
        dueDate: new Date(),
      });
      setEditingMilestone(null);
      setIsAddMilestoneOpen(false);

      toast({
        title: "Success",
        description: "Milestone updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update milestone",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetMilestoneForm = () => {
    setMilestoneForm({
      title: "",
      description: "",
      dueDate: new Date(),
    });
    setEditingMilestone(null);
    setIsAddMilestoneOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Project Timeline</CardTitle>
          <Dialog
            open={isAddMilestoneOpen}
            onOpenChange={setIsAddMilestoneOpen}
          >
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setEditingMilestone(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Milestone
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingMilestone ? "Edit Milestone" : "Add New Milestone"}
                </DialogTitle>
                <DialogDescription>
                  {editingMilestone
                    ? "Update the milestone details below."
                    : "Create a new milestone for this project."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={milestoneForm.title}
                    onChange={(e) =>
                      setMilestoneForm({
                        ...milestoneForm,
                        title: e.target.value,
                      })
                    }
                    placeholder="Enter milestone title"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={milestoneForm.description}
                    onChange={(e) =>
                      setMilestoneForm({
                        ...milestoneForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Enter milestone description (optional)"
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Due Date</Label>
                  <div className="border rounded-md p-3 bg-background">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setCalendarMonth(subMonths(calendarMonth, 1))
                        }
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="font-medium">
                        {format(calendarMonth, "MMMM yyyy")}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setCalendarMonth(addMonths(calendarMonth, 1))
                        }
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                        <div
                          key={day}
                          className="text-center text-xs font-medium text-muted-foreground p-2"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const monthStart = startOfMonth(calendarMonth);
                        const monthEnd = endOfMonth(calendarMonth);
                        const calendarStart = startOfWeek(monthStart);
                        const calendarEnd = endOfWeek(monthEnd);
                        const days = eachDayOfInterval({
                          start: calendarStart,
                          end: calendarEnd,
                        });

                        return days.map((day) => {
                          const isCurrentMonth = isSameMonth(
                            day,
                            calendarMonth
                          );
                          const isSelected = isSameDay(
                            day,
                            milestoneForm.dueDate
                          );
                          const isToday = isSameDay(day, new Date());

                          return (
                            <Button
                              key={day.toISOString()}
                              variant="ghost"
                              size="sm"
                              className={`h-8 w-8 p-0 text-sm ${
                                !isCurrentMonth
                                  ? "text-muted-foreground/50"
                                  : isSelected
                                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                    : isToday
                                      ? "bg-accent text-accent-foreground"
                                      : "hover:bg-accent"
                              }`}
                              onClick={() => {
                                setMilestoneForm({
                                  ...milestoneForm,
                                  dueDate: day,
                                });
                              }}
                            >
                              {format(day, "d")}
                            </Button>
                          );
                        });
                      })()}
                    </div>

                    {/* Selected Date Display */}
                    <div className="mt-3 pt-3 border-t text-center">
                      <p className="text-sm text-muted-foreground">
                        Selected: {format(milestoneForm.dueDate, "PPP")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetMilestoneForm}>
                  Cancel
                </Button>
                <Button
                  onClick={
                    editingMilestone
                      ? handleUpdateMilestone
                      : handleAddMilestone
                  }
                  disabled={isSubmitting || !milestoneForm.title.trim()}
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingMilestone
                      ? "Update"
                      : "Add"}{" "}
                  Milestone
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {project.timeline.milestones.map((milestone, index) => (
            <div
              key={milestone.id}
              className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/20 transition-colors"
            >
              <div className="flex flex-col items-center">
                <button
                  onClick={() =>
                    handleToggleMilestone(milestone.id, !milestone.completed)
                  }
                  className="transition-colors hover:scale-110"
                >
                  {milestone.completed ? (
                    <CheckCircle className="h-6 w-6 text-green-600 cursor-pointer" />
                  ) : (
                    <Circle className="h-6 w-6 text-muted-foreground cursor-pointer hover:text-green-600" />
                  )}
                </button>
                {index < project.timeline.milestones.length - 1 && (
                  <div className="w-0.5 h-8 bg-border mt-2" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4
                      className={`font-medium cursor-pointer hover:text-primary ${
                        milestone.completed
                          ? "line-through text-muted-foreground"
                          : ""
                      }`}
                      onClick={() => handleEditMilestone(milestone)}
                    >
                      {milestone.title}
                    </h4>
                    {milestone.description && (
                      <p
                        className={`text-sm mt-1 ${
                          milestone.completed
                            ? "line-through text-muted-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {milestone.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>
                        Due {format(new Date(milestone.dueDate), "MMM d, yyyy")}
                      </span>
                      {milestone.assignedTo &&
                        milestone.assignedTo.length > 0 && (
                          <span>{milestone.assignedTo.length} assigned</span>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {project.timeline.milestones.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No milestones yet</p>
              <p className="text-sm">
                Add your first milestone to start tracking progress
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
