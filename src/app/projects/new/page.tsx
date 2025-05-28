"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/hooks/useFirebaseAuth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTitle } from "@/components/ui/PageTitle";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Users,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  ProjectTemplate,
  ProjectType,
  CreateProjectRequest,
} from "@/types/project";
import { toast } from "@/components/ui/use-toast";

interface ProjectCreationStep {
  id: string;
  title: string;
  description: string;
}

const steps: ProjectCreationStep[] = [
  {
    id: "template",
    title: "Choose Template",
    description: "Select a project template or start from scratch",
  },
  {
    id: "details",
    title: "Project Details",
    description: "Set up basic project information",
  },
  {
    id: "timeline",
    title: "Timeline & Budget",
    description: "Configure timeline and budget settings",
  },
  {
    id: "review",
    title: "Review & Create",
    description: "Review your project settings and create",
  },
];

export default function NewProjectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<ProjectTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  // Form data
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "custom" as ProjectType,
    startDate: new Date(),
    estimatedDuration: 30,
    budget: {
      total: 0,
      currency: "USD",
    },
  });

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    fetchTemplates();
  }, [session, status]);

  const fetchTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const response = await fetch("/api/projects/templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      setTemplates(data.templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Error",
        description: "Failed to load project templates",
        variant: "destructive",
      });
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleTemplateSelect = (template: ProjectTemplate | null) => {
    setSelectedTemplate(template);
    if (template) {
      setFormData((prev) => ({
        ...prev,
        type: template.type,
        estimatedDuration: template.defaultTimeline.estimatedDuration || 30,
        budget: {
          total: template.defaultBudget?.total || 0,
          currency: template.defaultBudget?.currency || "USD",
        },
      }));
    } else {
      // Reset to defaults for custom project
      setFormData((prev) => ({
        ...prev,
        type: "custom",
        estimatedDuration: 30,
        budget: {
          total: 0,
          currency: "USD",
        },
      }));
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateProject = async () => {
    try {
      setLoading(true);

      const projectData: CreateProjectRequest = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        timeline: {
          startDate: formData.startDate,
          estimatedDuration: formData.estimatedDuration,
        },
        budget: formData.budget.total > 0 ? formData.budget : undefined,
        templateId: selectedTemplate?._id,
      };

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create project");
      }

      const { project } = await response.json();

      toast({
        title: "Success",
        description: "Project created successfully",
      });

      router.push(`/projects/${project._id}`);
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create project",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return true; // Template selection is optional
      case 1:
        return formData.title.trim() && formData.description.trim();
      case 2:
        return formData.startDate && formData.estimatedDuration > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  if (status === "loading" || templatesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container-wide px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container-wide px-6 py-8">
        <div className="space-y-6 sm:space-y-8">
          <PageTitle title="Create New Project">
            <Button
              variant="outline"
              onClick={() => router.push("/projects")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Projects
            </Button>
          </PageTitle>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium",
                    index <= currentStep
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border"
                  )}
                >
                  {index < currentStep ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="ml-3 hidden sm:block">
                  <div
                    className={cn(
                      "text-sm font-medium",
                      index <= currentStep
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {step.description}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-12 h-0.5 mx-4",
                      index < currentStep ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="max-w-4xl mx-auto">
            {/* Step 1: Template Selection */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">
                    Choose a Project Template
                  </h2>
                  <p className="text-muted-foreground">
                    Select a template to get started quickly, or choose "Custom"
                    to build from scratch.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Custom Project Option */}
                  <Card
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-lg",
                      !selectedTemplate && "ring-2 ring-primary"
                    )}
                    onClick={() => handleTemplateSelect(null)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle>Custom Project</CardTitle>
                        <Badge variant="outline">Custom</Badge>
                      </div>
                      <CardDescription>
                        Start from scratch with a flexible template
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Flexible timeline
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Any team size
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Custom budget
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Template Options */}
                  {templates.map((template) => (
                    <Card
                      key={template._id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-lg",
                        selectedTemplate?._id === template._id &&
                          "ring-2 ring-primary"
                      )}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">
                            {template.name}
                          </CardTitle>
                          <Badge variant="outline">
                            {getTypeLabel(template.type)}
                          </Badge>
                        </div>
                        <CardDescription>
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {template.defaultTimeline.estimatedDuration} days
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {template.requiredRoles.length} roles
                          </div>
                          {template.defaultBudget && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              {template.defaultBudget.currency}{" "}
                              {template.defaultBudget.total?.toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div className="mt-3">
                          <div className="text-xs text-muted-foreground mb-1">
                            {template.defaultTimeline.milestones.length}{" "}
                            milestones
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Roles: {template.requiredRoles.join(", ")}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Project Details */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">
                    Project Details
                  </h2>
                  <p className="text-muted-foreground">
                    Provide basic information about your project.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Project Title *
                      </label>
                      <Input
                        value={formData.title}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        placeholder="Enter project title"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Project Type
                      </label>
                      <CustomDropdown
                        value={formData.type}
                        onChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            type: value as ProjectType,
                          }))
                        }
                        options={[
                          { value: "documentation", label: "Documentation" },
                          { value: "media_campaign", label: "Media Campaign" },
                          { value: "event_coverage", label: "Event Coverage" },
                          { value: "custom", label: "Custom" },
                        ]}
                        placeholder="Select project type"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Description *
                    </label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Describe your project goals and requirements"
                      className="h-32"
                    />
                  </div>
                </div>

                {selectedTemplate && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Template: {selectedTemplate.name}
                      </CardTitle>
                      <CardDescription>
                        {selectedTemplate.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        This template includes{" "}
                        {selectedTemplate.defaultTimeline.milestones.length}{" "}
                        milestones and requires the following roles:{" "}
                        {selectedTemplate.requiredRoles.join(", ")}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Step 3: Timeline & Budget */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">
                    Timeline & Budget
                  </h2>
                  <p className="text-muted-foreground">
                    Set up your project timeline and budget.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Start Date *
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.startDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.startDate
                              ? format(formData.startDate, "PPP")
                              : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.startDate}
                            onSelect={(date) =>
                              date &&
                              setFormData((prev) => ({
                                ...prev,
                                startDate: date,
                              }))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Estimated Duration (days)
                      </label>
                      <Input
                        type="number"
                        value={formData.estimatedDuration}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            estimatedDuration: parseInt(e.target.value) || 0,
                          }))
                        }
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Budget (optional)
                      </label>
                      <div className="flex gap-2">
                        <CustomDropdown
                          value={formData.budget.currency}
                          onChange={(value) =>
                            setFormData((prev) => ({
                              ...prev,
                              budget: { ...prev.budget, currency: value },
                            }))
                          }
                          options={[
                            { value: "USD", label: "USD" },
                            { value: "EUR", label: "EUR" },
                            { value: "GBP", label: "GBP" },
                            { value: "CAD", label: "CAD" },
                          ]}
                          placeholder="Select currency"
                        />
                        <Input
                          type="number"
                          value={formData.budget.total}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              budget: {
                                ...prev.budget,
                                total: parseFloat(e.target.value) || 0,
                              },
                            }))
                          }
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {selectedTemplate && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Template Milestones
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedTemplate.defaultTimeline.milestones.map(
                          (milestone, index) => (
                            <div
                              key={milestone.id}
                              className="flex items-center gap-3 text-sm"
                            >
                              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center">
                                {index + 1}
                              </div>
                              <div>
                                <div className="font-medium">
                                  {milestone.title}
                                </div>
                                <div className="text-muted-foreground text-xs">
                                  {milestone.description}
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">
                    Review & Create
                  </h2>
                  <p className="text-muted-foreground">
                    Review your project settings before creating.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Project Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="text-sm font-medium">Title</div>
                        <div className="text-sm text-muted-foreground">
                          {formData.title}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Type</div>
                        <div className="text-sm text-muted-foreground">
                          {getTypeLabel(formData.type)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Description</div>
                        <div className="text-sm text-muted-foreground">
                          {formData.description}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Timeline & Budget</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="text-sm font-medium">Start Date</div>
                        <div className="text-sm text-muted-foreground">
                          {format(formData.startDate, "PPP")}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Duration</div>
                        <div className="text-sm text-muted-foreground">
                          {formData.estimatedDuration} days
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Budget</div>
                        <div className="text-sm text-muted-foreground">
                          {formData.budget.total > 0
                            ? `${formData.budget.currency} ${formData.budget.total.toLocaleString()}`
                            : "No budget set"}
                        </div>
                      </div>
                      {selectedTemplate && (
                        <div>
                          <div className="text-sm font-medium">Template</div>
                          <div className="text-sm text-muted-foreground">
                            {selectedTemplate.name}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-6 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </div>

            {currentStep < steps.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleCreateProject}
                disabled={!canProceed() || loading}
                className="flex items-center gap-2"
              >
                {loading ? "Creating..." : "Create Project"}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
