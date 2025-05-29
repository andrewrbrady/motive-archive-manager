import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";

interface JsonUploadPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any[]) => Promise<void>;
  title: string;
  description?: string;
  expectedType: string; // "events", "deliverables", or "cars"
  isSubmitting?: boolean;
}

export default function JsonUploadPasteModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  expectedType,
  isSubmitting = false,
}: JsonUploadPasteModalProps) {
  const [jsonText, setJsonText] = useState("");
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    error?: string;
    data?: any[];
    count?: number;
  }>({ isValid: false });
  const [uploadMethod, setUploadMethod] = useState<"paste" | "upload">("paste");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateJsonData = useCallback(
    (
      data: any
    ): { isValid: boolean; error?: string; data?: any[]; count?: number } => {
      try {
        // For cars, we can accept either a single object or an array with one object
        if (expectedType === "cars") {
          let carData: any[];

          if (Array.isArray(data)) {
            if (data.length === 0) {
              return { isValid: false, error: "Array cannot be empty" };
            }
            if (data.length > 1) {
              return {
                isValid: false,
                error:
                  "Only one car object is allowed. Please provide a single car object or an array with one car.",
              };
            }
            carData = data;
          } else if (typeof data === "object" && data !== null) {
            // Single object - wrap it in an array for consistent handling
            carData = [data];
          } else {
            return {
              isValid: false,
              error:
                "JSON must be a car object or an array with one car object",
            };
          }

          // Validate the car object
          const car = carData[0];
          if (!car.make || !car.model) {
            return {
              isValid: false,
              error: "Car object missing required fields: make, model",
            };
          }

          return { isValid: true, data: carData, count: 1 };
        }

        // For events and deliverables, we expect arrays
        if (!Array.isArray(data)) {
          return { isValid: false, error: "JSON must be an array of items" };
        }

        if (data.length === 0) {
          return { isValid: false, error: "Array cannot be empty" };
        }

        // Basic validation based on expected type
        if (expectedType === "events") {
          for (let i = 0; i < data.length; i++) {
            const item = data[i];
            if (!item.type || !item.title || !item.start) {
              return {
                isValid: false,
                error: `Event at index ${i} missing required fields: type, title, start`,
              };
            }
          }
        } else if (expectedType === "deliverables") {
          for (let i = 0; i < data.length; i++) {
            const item = data[i];
            if (
              !item.title ||
              !item.platform ||
              !item.type ||
              !item.edit_deadline
            ) {
              return {
                isValid: false,
                error: `Deliverable at index ${i} missing required fields: title, platform, type, edit_deadline`,
              };
            }
          }
        }

        return { isValid: true, data, count: data.length };
      } catch (error) {
        return { isValid: false, error: "Invalid JSON format" };
      }
    },
    [expectedType]
  );

  const handleTextChange = (text: string) => {
    setJsonText(text);

    if (!text.trim()) {
      setValidationResult({ isValid: false });
      return;
    }

    try {
      const parsed = JSON.parse(text);
      const result = validateJsonData(parsed);
      setValidationResult(result);
    } catch (error) {
      setValidationResult({
        isValid: false,
        error: "Invalid JSON syntax",
      });
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      toast.error("Please select a valid JSON file");
      return;
    }

    try {
      const fileContent = await file.text();
      setJsonText(fileContent);
      handleTextChange(fileContent);
      setUploadMethod("upload");
    } catch (error) {
      console.error("Error reading file:", error);
      toast.error("Failed to read file");
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async () => {
    if (!validationResult.isValid || !validationResult.data) {
      toast.error("Please provide valid JSON data");
      return;
    }

    try {
      await onSubmit(validationResult.data);
      handleClose();
    } catch (error) {
      console.error("Error submitting data:", error);
      // Error handling is done in the parent component
    }
  };

  const handleClose = () => {
    setJsonText("");
    setValidationResult({ isValid: false });
    setUploadMethod("paste");
    onClose();
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <p className="text-sm text-muted-foreground mt-2">{description}</p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload method selection */}
          <div className="flex gap-2">
            <Button
              variant={uploadMethod === "paste" ? "default" : "outline"}
              size="sm"
              onClick={() => setUploadMethod("paste")}
            >
              <FileText className="w-4 h-4 mr-2" />
              Paste JSON
            </Button>
            <Button
              variant={uploadMethod === "upload" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setUploadMethod("upload");
                triggerFileUpload();
              }}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload JSON File
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* JSON input area */}
          <div className="space-y-2">
            <Label htmlFor="json-input">JSON Data</Label>
            <Textarea
              id="json-input"
              placeholder={
                expectedType === "cars"
                  ? `Paste your car JSON object here...`
                  : `Paste your ${expectedType} JSON array here...`
              }
              value={jsonText}
              onChange={(e) => handleTextChange(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          {/* Validation result */}
          {jsonText.trim() && (
            <Card
              className={`${validationResult.isValid ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
            >
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  {validationResult.isValid ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    {validationResult.isValid ? (
                      <div className="text-green-800">
                        <p className="font-medium">Valid JSON</p>
                        <p className="text-sm">
                          Ready to{" "}
                          {expectedType === "cars"
                            ? "populate form with car data"
                            : `create ${validationResult.count} ${expectedType}`}
                        </p>
                      </div>
                    ) : (
                      <div className="text-red-800">
                        <p className="font-medium">Invalid JSON</p>
                        <p className="text-sm">{validationResult.error}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Example format hint */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-sm text-blue-800 font-medium mb-2">
                Expected format for {expectedType}:
              </p>
              <pre className="text-xs text-blue-700 overflow-x-auto">
                {(() => {
                  if (expectedType === "events") {
                    return `[
  {
    "type": "PRODUCTION",
    "title": "Video Shoot",
    "description": "Main video production",
    "start": "2024-01-15T09:00:00.000Z",
    "end": "2024-01-15T17:00:00.000Z",
    "isAllDay": false
  }
]`;
                  } else if (expectedType === "deliverables") {
                    return `[
  {
    "title": "Instagram Reel",
    "platform": "Instagram Reels",
    "type": "Video",
    "duration": 15,
    "aspect_ratio": "9:16",
    "edit_deadline": "2024-01-20T17:00:00.000Z",
    "release_date": "2024-01-22T12:00:00.000Z",
    "editor": "John Doe",
    "status": "not_started"
  }
]`;
                  } else {
                    return `{
  "make": "Toyota",
  "model": "Camry",
  "year": 2020,
  "color": "Silver",
  "mileage": {
    "value": 50000,
    "unit": "miles"
  },
  "vin": "1HGBH41JXMN109186",
  "status": "available",
  "condition": "excellent",
  "price": {
    "listPrice": 25000,
    "priceHistory": []
  },
  "engine": {
    "type": "4-cylinder",
    "displacement": {
      "value": 2.5,
      "unit": "L"
    }
  },
  "transmission": {
    "type": "automatic"
  }
}`;
                  }
                })()}
              </pre>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!validationResult.isValid || isSubmitting}
          >
            {isSubmitting
              ? expectedType === "cars"
                ? "Populating..."
                : "Creating..."
              : expectedType === "cars"
                ? "Populate Form"
                : `Create ${validationResult.count || 0} ${expectedType}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
