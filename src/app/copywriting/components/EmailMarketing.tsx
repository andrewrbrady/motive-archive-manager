"use client";

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Car as CarIcon, Eye, Code } from "lucide-react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

interface OutlineItem {
  id: string;
  text: string;
  completed: boolean;
}

// Add a new interface for instruction items
interface InstructionItem {
  id: string;
  text: string;
  completed: boolean;
}

// Define a basic Car interface for the dropdown
interface Car {
  _id: string;
  make: string;
  model: string;
  year: number;
  description?: string;
}

const emailFormSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  fromName: z.string().min(1, "Sender name is required"),
  fromEmail: z.string().email("Valid email required"),
  toEmail: z.string().email("Valid email required"),
  emailType: z.enum(["newsletter", "promotion", "announcement", "follow-up"]),
  carId: z.string().optional(),
  testMode: z.boolean().default(true),
});

type EmailFormValues = z.infer<typeof emailFormSchema>;

export default function EmailMarketing() {
  const { toast } = useToast();
  const [promptInput, setPromptInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [instructionItems, setInstructionItems] = useState<InstructionItem[]>(
    []
  );
  const [outlineItems, setOutlineItems] = useState<OutlineItem[]>([]);
  const [modificationInput, setModificationInput] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [cars, setCars] = useState<Car[]>([]);
  const [isLoadingCars, setIsLoadingCars] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      subject: "",
      fromName: "",
      fromEmail: "",
      toEmail: "",
      emailType: "newsletter",
      carId: "none",
      testMode: true,
    },
  });

  // Fetch cars when component mounts
  useEffect(() => {
    const fetchCars = async () => {
      setIsLoadingCars(true);
      try {
        const response = await fetch("/api/cars/list");
        if (!response.ok) {
          throw new Error("Failed to fetch cars");
        }
        const data = await response.json();
        setCars(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching cars:", error);
        setCars([]);
        toast({
          title: "Error",
          description:
            "Failed to load cars. You can continue without car selection.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingCars(false);
      }
    };

    fetchCars();
  }, [toast]);

  // Fetch car details when car ID changes
  useEffect(() => {
    const carId = form.getValues("carId");
    if (!carId || carId === "none") {
      setSelectedCar(null);
      return;
    }

    const fetchCarDetails = async () => {
      try {
        const response = await fetch(`/api/cars/${carId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch car details");
        }
        const data = await response.json();
        setSelectedCar(data);
      } catch (error) {
        console.error("Error fetching car details:", error);
        setSelectedCar(null);
        toast({
          title: "Warning",
          description: "Failed to load detailed car information.",
          variant: "default",
        });
      }
    };

    fetchCarDetails();
  }, [form.watch("carId"), toast]);

  // Handle the generation of instructions based on the prompt
  const handleGenerateInstructions = async () => {
    if (!promptInput.trim()) return;

    setIsGenerating(true);
    try {
      const carId = form.getValues("carId");
      const response = await fetch(
        "/api/copywriting/email/generate-instructions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: promptInput,
            emailType: form.getValues("emailType"),
            carId: carId !== "none" ? carId : undefined,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate instructions");

      const data = await response.json();

      // Parse instructions into separate checklist items
      const instructionsText = data.instructions || "";
      setInstructions(instructionsText);

      // Split instructions by line breaks and bullet points
      let instructionsList = instructionsText
        .split(/[\n\r]+/)
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0)
        .map((line: string) => line.replace(/^[-•*]\s*/, "")); // Remove bullet points if present

      // Convert to InstructionItem objects
      const instructionsWithIds = instructionsList.map((text: string) => ({
        id: Math.random().toString(36).substring(2, 9),
        text,
        completed: false,
      }));

      setInstructionItems(instructionsWithIds);

      // Set subject if available from the API response
      if (data.subject) {
        form.setValue("subject", data.subject);
      }

      // Generate outline items from the instructions
      const generatedOutline = data.outline || [];
      const outlineWithIds = generatedOutline.map((item: string) => ({
        id: Math.random().toString(36).substring(2, 9),
        text: item,
        completed: false,
      }));

      setOutlineItems(outlineWithIds);
    } catch (error) {
      console.error("Error generating instructions:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Add a new function to toggle instruction item completion
  const toggleInstructionItem = (id: string) => {
    setInstructionItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  // Handle modifications to the outline
  const handleModifyOutline = async () => {
    if (!modificationInput.trim()) return;

    setIsGenerating(true);
    try {
      const carId = form.getValues("carId");
      const response = await fetch("/api/copywriting/email/modify-outline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instructions: instructions,
          emailType: form.getValues("emailType"),
          carId: carId !== "none" ? carId : undefined,
          currentOutline: outlineItems.map((item) => item.text),
          modifications: modificationInput,
        }),
      });

      if (!response.ok) throw new Error("Failed to modify outline");

      const data = await response.json();
      const modifiedOutline = data.outline || [];
      const outlineWithIds = modifiedOutline.map((item: string) => ({
        id: Math.random().toString(36).substring(2, 9),
        text: item,
        completed: false,
      }));

      setOutlineItems(outlineWithIds);
      setModificationInput("");
    } catch (error) {
      console.error("Error modifying outline:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle generating email content based on the current outline step
  const handleGenerateContent = async () => {
    if (currentStep >= outlineItems.length) return;

    setIsGenerating(true);

    // Show toast notification to inform user about the process
    toast({
      title: `Generating paragraph for "${outlineItems[currentStep]?.text}"`,
      description:
        "Creating a concise paragraph focused on this specific topic...",
      duration: 3000,
    });

    try {
      const carId = form.getValues("carId");
      const response = await fetch("/api/copywriting/email/generate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instructions: instructions,
          emailType: form.getValues("emailType"),
          subject: form.getValues("subject"),
          carId: carId !== "none" ? carId : undefined,
          currentOutline: outlineItems.map((item) => item.text),
          currentStep: currentStep,
          currentContent: emailContent,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate content");

      const data = await response.json();

      // Update the email content with the new content
      setEmailContent((prev) => {
        const newContent = data.content || "";

        // If this is the first section or prev is empty, just use the new content
        if (!prev || prev.trim() === "") {
          return newContent;
        }

        // Clean up any potential HTML artifacts
        let cleanNewContent = newContent.trim();

        // If new content starts with a paragraph tag but previous content doesn't end with one
        // This ensures proper HTML structure
        if (
          cleanNewContent.startsWith("<p>") &&
          !prev.trim().toLowerCase().endsWith("</p>")
        ) {
          return `${prev}</p>${cleanNewContent}`;
        }

        // If previous content ends with a closing tag and new content starts with an opening tag
        // Just join them directly
        if (
          (prev.trim().endsWith(">") && cleanNewContent.startsWith("<")) ||
          prev.trim().toLowerCase().endsWith("</p>") ||
          prev.trim().toLowerCase().endsWith("</li>") ||
          prev.trim().toLowerCase().endsWith("</ul>")
        ) {
          return `${prev}${cleanNewContent}`;
        }

        // Default case - just append with a space
        return `${prev} ${cleanNewContent}`;
      });

      // Notify user of successful paragraph generation
      toast({
        title: "Paragraph added",
        description:
          "Continue adding paragraphs or mark section complete when satisfied.",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error generating content:", error);
      toast({
        title: "Error",
        description: "Failed to generate paragraph. Please try again.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle the completion status of an outline item and advance to next section if needed
  const completeCurrentSection = () => {
    if (currentStep >= outlineItems.length) return;

    // Mark current section as complete
    setOutlineItems((prev) =>
      prev.map((item, idx) =>
        idx === currentStep ? { ...item, completed: true } : item
      )
    );

    // Move to the next section
    setCurrentStep((prev) => prev + 1);

    toast({
      title: "Section completed",
      description:
        currentStep + 1 < outlineItems.length
          ? `Moving to next section: "${outlineItems[currentStep + 1]?.text}"`
          : "All sections completed! You can now review and send your email.",
      duration: 3000,
    });
  };

  // Toggle the completion status of an outline item
  const toggleOutlineItem = (id: string) => {
    setOutlineItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  // Handle sending the email via SendGrid
  const handleSendEmail = async (values: EmailFormValues) => {
    if (!emailContent.trim()) {
      toast({
        title: "Error",
        description: "Email content cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/copywriting/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          content: emailContent,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send email");
      }

      toast({
        title: "Success",
        description: values.testMode
          ? "Test email sent successfully"
          : "Email campaign started successfully",
      });
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to send email",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Column 1: Initial Prompt & Email Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Email Campaign Brief</h3>

        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="emailType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="border-[hsl(var(--border))] bg-[hsl(var(--background))]">
                        <SelectValue placeholder="Select an email type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[hsl(var(--background-card))] border-[hsl(var(--border))]">
                      <SelectItem value="newsletter">Newsletter</SelectItem>
                      <SelectItem value="promotion">Promotion</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="follow-up">Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="carId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Featured Car</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoadingCars}
                  >
                    <FormControl>
                      <SelectTrigger className="flex items-center border-[hsl(var(--border))] bg-[hsl(var(--background))]">
                        <CarIcon className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Select a car (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[hsl(var(--background-card))] border-[hsl(var(--border))]">
                      <SelectItem value="none">No car selected</SelectItem>
                      {Array.isArray(cars) ? (
                        cars.map((car) => (
                          <SelectItem key={car._id} value={car._id}>
                            {car.year} {car.make} {car.model}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="error">
                          Error loading cars
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {isLoadingCars && (
                    <div className="flex items-center mt-1 text-xs text-[hsl(var(--foreground-muted))]">
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Loading cars...
                    </div>
                  )}
                  {selectedCar && (
                    <div className="mt-2 p-2 bg-[hsl(var(--background))] rounded-md text-sm">
                      <p className="font-medium">
                        {selectedCar.year} {selectedCar.make}{" "}
                        {selectedCar.model}
                      </p>
                      {selectedCar.description && (
                        <p className="text-[hsl(var(--foreground-muted))] mt-1 text-xs line-clamp-2">
                          {selectedCar.description}
                        </p>
                      )}
                    </div>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject Line</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter email subject"
                      {...field}
                      className="border-[hsl(var(--border))] bg-[hsl(var(--background))]"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>

        <Textarea
          placeholder="Describe your email campaign (e.g., 'Send a newsletter about our latest car models with a 10% discount offer')"
          className="min-h-[200px] border-[hsl(var(--border))] bg-[hsl(var(--background))]"
          value={promptInput}
          onChange={(e) => setPromptInput(e.target.value)}
        />

        <Button
          onClick={handleGenerateInstructions}
          disabled={isGenerating || !promptInput.trim()}
          className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-hover))]"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Instructions"
          )}
        </Button>
      </div>

      {/* Column 2: Instructions & Outline */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Email Structure</h3>

        {/* Instructions display as a checklist */}
        {instructionItems.length > 0 && (
          <Card className="p-4 mb-4 border-[hsl(var(--border))] bg-[hsl(var(--background))]">
            <h4 className="font-medium mb-2">Instructions Checklist</h4>
            <ul className="space-y-2">
              {instructionItems.map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <Checkbox
                    id={`instruction-${item.id}`}
                    checked={item.completed}
                    onCheckedChange={() => toggleInstructionItem(item.id)}
                    className="mt-1 border-[hsl(var(--border))]"
                  />
                  <label
                    htmlFor={`instruction-${item.id}`}
                    className={`text-sm ${
                      item.completed
                        ? "line-through text-[hsl(var(--foreground-muted))]"
                        : ""
                    }`}
                  >
                    {item.text}
                  </label>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Outline modification */}
        <div className="space-y-2">
          <Textarea
            placeholder="Modify the email structure (e.g., 'Add a product showcase section', 'Include a stronger call to action')"
            value={modificationInput}
            onChange={(e) => setModificationInput(e.target.value)}
            className="min-h-[100px] border-[hsl(var(--border))] bg-[hsl(var(--background))]"
          />
          <Button
            onClick={handleModifyOutline}
            disabled={
              isGenerating || !instructions || !modificationInput.trim()
            }
            size="sm"
            className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-hover))]"
          >
            Apply Modifications
          </Button>
        </div>

        {/* Outline with checkboxes */}
        {outlineItems.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium mb-2">Email Structure</h4>
            <ul className="space-y-2">
              {outlineItems.map((item, index) => (
                <li key={item.id} className="flex items-start gap-2">
                  <Checkbox
                    id={item.id}
                    checked={item.completed}
                    onCheckedChange={() => toggleOutlineItem(item.id)}
                    className="mt-1 border-[hsl(var(--border))]"
                  />
                  <label
                    htmlFor={item.id}
                    className={`text-sm ${
                      item.completed
                        ? "line-through text-[hsl(var(--foreground-muted))]"
                        : ""
                    } ${
                      index === currentStep
                        ? "font-semibold bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded"
                        : ""
                    }`}
                  >
                    {item.text}
                    {index === currentStep && !item.completed && (
                      <span className="ml-2 text-xs italic text-yellow-600 dark:text-yellow-400">
                        (current)
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Column 3: Email Content & Send Options */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Email Content</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant={previewMode ? "outline" : "default"}
              size="sm"
              onClick={() => setPreviewMode(false)}
              className="flex items-center border-[hsl(var(--border))]"
            >
              <Code className="h-4 w-4 mr-1" /> Edit
            </Button>
            <Button
              variant={previewMode ? "default" : "outline"}
              size="sm"
              onClick={() => setPreviewMode(true)}
              className="flex items-center border-[hsl(var(--border))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
            >
              <Eye className="h-4 w-4 mr-1" /> Preview
            </Button>
          </div>
        </div>

        {previewMode ? (
          <Card className="p-6 min-h-[300px] overflow-y-auto border-[hsl(var(--border))] bg-[hsl(var(--background-card))]">
            <div className="mb-3 text-xs text-[hsl(var(--foreground-muted))]">
              <p className="flex items-center">
                <Eye className="h-3 w-3 mr-1 inline" />
                Preview mode: This shows how your email will appear to
                recipients with proper formatting.
              </p>
            </div>
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: emailContent }}
            />
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-[hsl(var(--foreground-muted))]">
              <span>Writing paragraph by paragraph</span>
              <span>
                Section{" "}
                {currentStep + 1 > outlineItems.length
                  ? outlineItems.length
                  : currentStep + 1}{" "}
                of {outlineItems.length}:{" "}
                {currentStep < outlineItems.length
                  ? outlineItems[currentStep]?.text
                  : "Complete"}
              </span>
            </div>
            <Textarea
              placeholder="Your email content will appear here as it's generated..."
              className="min-h-[300px] border-[hsl(var(--border))] bg-[hsl(var(--background))]"
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
            />

            {outlineItems.length > 0 && currentStep < outlineItems.length && (
              <div className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded p-3 text-sm space-y-3">
                <h4 className="font-medium">Paragraph-by-Paragraph Building</h4>
                <p className="text-[hsl(var(--foreground-muted))] text-xs">
                  We're now generating one paragraph at a time for better
                  control. Generate multiple paragraphs for each section, then
                  mark the section as complete when you're satisfied.
                </p>
                <div className="flex space-x-2">
                  <Button
                    onClick={handleGenerateContent}
                    disabled={isGenerating}
                    size="sm"
                    variant="secondary"
                    className="border-[hsl(var(--border))]"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Another Paragraph"
                    )}
                  </Button>
                  <Button
                    onClick={completeCurrentSection}
                    disabled={isGenerating}
                    size="sm"
                    className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-hover))]"
                  >
                    Mark Section Complete & Continue
                  </Button>
                </div>
              </div>
            )}

            {outlineItems.length > 0 && currentStep >= outlineItems.length && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded p-4 text-sm space-y-2">
                <h4 className="font-medium text-green-700 dark:text-green-400 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  All Sections Completed!
                </h4>
                <p className="text-green-600 dark:text-green-300">
                  Your email is now ready. You can:
                </p>
                <ul className="list-disc pl-5 text-xs text-green-600 dark:text-green-300 space-y-1">
                  <li>
                    Preview your email to see how it will appear to recipients
                  </li>
                  <li>Make any final edits to the content</li>
                  <li>Proceed to the Send Options to deliver your email</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* SendGrid Options */}
        {emailContent && (
          <Card className="p-4 border-[hsl(var(--border))] bg-[hsl(var(--background-card))]">
            <h4 className="font-medium mb-4">Send Options</h4>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSendEmail)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fromName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Sender name"
                            {...field}
                            className="border-[hsl(var(--border))] bg-[hsl(var(--background))]"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fromEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="sender@example.com"
                            {...field}
                            className="border-[hsl(var(--border))] bg-[hsl(var(--background))]"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="toEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="recipient@example.com"
                          {...field}
                          className="border-[hsl(var(--border))] bg-[hsl(var(--background))]"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="testMode"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border-[hsl(var(--border))]"
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Send as test (only to the recipient email)
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isSending || !emailContent.trim()}
                  className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-hover))]"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {form.getValues("testMode")
                        ? "Send Test Email"
                        : "Send Campaign"}
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </Card>
        )}
      </div>
    </div>
  );
}
