"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { CheckCircle, Circle, Plus } from "lucide-react";
import { format } from "date-fns";
import { Project, ProjectType } from "@/types/project";
import { toast } from "@/components/ui/use-toast";

interface ProjectOverviewTabProps {
  project: Project;
  onProjectUpdate: () => void;
}

export function ProjectOverviewTab({
  project,
  onProjectUpdate,
}: ProjectOverviewTabProps) {
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    category: "materials",
    receipt: "",
  });

  const handleAddExpense = async () => {
    if (
      !expenseForm.description.trim() ||
      !expenseForm.amount ||
      parseFloat(expenseForm.amount) <= 0
    ) {
      toast({
        title: "Error",
        description: "Please provide a valid description and amount",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAddingExpense(true);
      const response = await fetch(`/api/projects/${project._id}/budget`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: expenseForm.description.trim(),
          amount: parseFloat(expenseForm.amount),
          category: expenseForm.category,
          receipt: expenseForm.receipt || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add expense");
      }

      // Refresh project data
      await onProjectUpdate();

      // Reset form and close modal
      setExpenseForm({
        description: "",
        amount: "",
        category: "materials",
        receipt: "",
      });
      setIsAddExpenseOpen(false);

      toast({
        title: "Success",
        description: "Expense added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add expense",
        variant: "destructive",
      });
    } finally {
      setIsAddingExpense(false);
    }
  };

  const handleRemoveExpense = async (expenseId: string) => {
    try {
      const response = await fetch(`/api/projects/${project._id}/budget`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expenseId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove expense");
      }

      // Refresh project data
      await onProjectUpdate();

      toast({
        title: "Success",
        description: "Expense removed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to remove expense",
        variant: "destructive",
      });
    }
  };

  const getTypeLabel = (type: ProjectType) => {
    switch (type) {
      case "documentation":
        return "Documentation";
      case "media_campaign":
        return "Media Campaign";
      case "event_coverage":
        return "Event Coverage";
      case "custom":
        return "Custom";
      default:
        return type;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "materials":
        return "bg-blue-100 text-blue-800";
      case "labor":
        return "bg-green-100 text-green-800";
      case "equipment":
        return "bg-purple-100 text-purple-800";
      case "travel":
        return "bg-orange-100 text-orange-800";
      case "software":
        return "bg-cyan-100 text-cyan-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle>Project Description</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-muted-foreground">{project.description}</p>
          </CardContent>
        </Card>

        {/* Recent Milestones */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Milestones</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {project.timeline.milestones.slice(0, 5).map((milestone) => (
                <div
                  key={milestone.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  {milestone.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{milestone.title}</div>
                    <div className="text-sm text-muted-foreground">
                      Due {format(new Date(milestone.dueDate), "MMM d, yyyy")}
                    </div>
                  </div>
                  {!milestone.completed &&
                    new Date(milestone.dueDate) < new Date() && (
                      <Badge variant="destructive" className="text-xs">
                        Overdue
                      </Badge>
                    )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {/* Project Details */}
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <div className="text-sm font-medium">Type</div>
              <div className="text-sm text-muted-foreground">
                {getTypeLabel(project.type)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">Created</div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(project.createdAt), "MMM d, yyyy")}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">Last Updated</div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(project.updatedAt), "MMM d, yyyy")}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget Summary */}
        {project.budget && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Budget Summary</CardTitle>
                <Dialog
                  open={isAddExpenseOpen}
                  onOpenChange={setIsAddExpenseOpen}
                >
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Expense
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Add New Expense</DialogTitle>
                      <DialogDescription>
                        Record a new expense for this project.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="expenseDescription">Description</Label>
                        <Input
                          id="expenseDescription"
                          value={expenseForm.description}
                          onChange={(e) =>
                            setExpenseForm({
                              ...expenseForm,
                              description: e.target.value,
                            })
                          }
                          placeholder="Enter expense description"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="expenseAmount">Amount</Label>
                        <Input
                          id="expenseAmount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={expenseForm.amount}
                          onChange={(e) =>
                            setExpenseForm({
                              ...expenseForm,
                              amount: e.target.value,
                            })
                          }
                          placeholder="0.00"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Category</Label>
                        <CustomDropdown
                          value={expenseForm.category}
                          onChange={(value) =>
                            setExpenseForm({
                              ...expenseForm,
                              category: value,
                            })
                          }
                          options={[
                            { value: "materials", label: "Materials" },
                            { value: "labor", label: "Labor" },
                            { value: "equipment", label: "Equipment" },
                            { value: "travel", label: "Travel" },
                            { value: "software", label: "Software" },
                            { value: "other", label: "Other" },
                          ]}
                          placeholder="Select category"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="expenseReceipt">
                          Receipt URL (Optional)
                        </Label>
                        <Input
                          id="expenseReceipt"
                          value={expenseForm.receipt}
                          onChange={(e) =>
                            setExpenseForm({
                              ...expenseForm,
                              receipt: e.target.value,
                            })
                          }
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setExpenseForm({
                            description: "",
                            amount: "",
                            category: "materials",
                            receipt: "",
                          });
                          setIsAddExpenseOpen(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddExpense}
                        disabled={isAddingExpense}
                      >
                        {isAddingExpense ? "Adding..." : "Add Expense"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">Total Budget</span>
                <span className="font-medium">
                  {project.budget.currency}{" "}
                  {project.budget.total.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Spent</span>
                <span className="font-medium">
                  {project.budget.currency}{" "}
                  {project.budget.spent.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Remaining</span>
                <span className="font-medium">
                  {project.budget.currency}{" "}
                  {project.budget.remaining.toLocaleString()}
                </span>
              </div>
              <Progress
                value={(project.budget.spent / project.budget.total) * 100}
                className="mt-2"
              />

              {/* Recent Expenses */}
              {project.budget?.expenses &&
                project.budget.expenses.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2">
                      Recent Expenses
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {project.budget.expenses.slice(-3).map((expense) => (
                        <div
                          key={expense.id}
                          className="flex justify-between items-center text-xs group"
                        >
                          <div className="flex items-center gap-2">
                            <Badge
                              className={getCategoryColor(expense.category)}
                              variant="secondary"
                            >
                              {expense.category}
                            </Badge>
                            <span className="truncate">
                              {expense.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {project.budget?.currency}{" "}
                              {expense.amount.toLocaleString()}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveExpense(expense.id)}
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        {/* Tags */}
        {project.tags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
