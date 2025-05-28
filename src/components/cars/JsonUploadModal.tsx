"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { JsonUpload } from "@/components/ui/json-upload";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, FileText, Merge, Replace } from "lucide-react";
import { toast } from "react-hot-toast";

interface JsonUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyJson: (data: any, mode: "merge" | "replace") => void;
  currentData?: any;
}

export function JsonUploadModal({
  isOpen,
  onClose,
  onApplyJson,
  currentData,
}: JsonUploadModalProps) {
  const [uploadedData, setUploadedData] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [applyMode, setApplyMode] = useState<"merge" | "replace">("merge");

  const handleJsonParsed = (data: any) => {
    setUploadedData(data);
    setUploadError(null);
  };

  const handleUploadError = (error: string) => {
    setUploadError(error);
    setUploadedData(null);
  };

  const handleApply = () => {
    if (!uploadedData) {
      toast.error("No JSON data to apply");
      return;
    }

    try {
      onApplyJson(uploadedData, applyMode);
      handleClose();
      toast.success(
        `Specifications ${applyMode === "merge" ? "merged" : "replaced"} successfully`
      );
    } catch (error) {
      toast.error("Failed to apply JSON data");
      console.error("Error applying JSON:", error);
    }
  };

  const handleClose = () => {
    setUploadedData(null);
    setUploadError(null);
    setApplyMode("merge");
    onClose();
  };

  const renderJsonPreview = (data: any, title: string) => {
    if (!data) return null;

    const jsonString = JSON.stringify(data, null, 2);
    const lines = jsonString.split("\n");
    const truncatedLines = lines.slice(0, 20); // Show first 20 lines
    const isTruncated = lines.length > 20;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">{title}</h4>
          <Badge variant="outline" className="text-xs">
            {Object.keys(data).length} fields
          </Badge>
        </div>
        <ScrollArea className="h-64 w-full rounded border bg-muted/30 p-3">
          <pre className="text-xs font-mono">
            {truncatedLines.join("\n")}
            {isTruncated && (
              <div className="text-muted-foreground mt-2">
                ... ({lines.length - 20} more lines)
              </div>
            )}
          </pre>
        </ScrollArea>
      </div>
    );
  };

  const getFieldDifferences = () => {
    if (!uploadedData || !currentData)
      return { new: [], updated: [], unchanged: [] };

    const newFields: string[] = [];
    const updatedFields: string[] = [];
    const unchangedFields: string[] = [];

    const checkFields = (uploaded: any, current: any, prefix = "") => {
      Object.keys(uploaded).forEach((key) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (!(key in current)) {
          newFields.push(fullKey);
        } else if (
          typeof uploaded[key] === "object" &&
          uploaded[key] !== null &&
          typeof current[key] === "object" &&
          current[key] !== null
        ) {
          checkFields(uploaded[key], current[key], fullKey);
        } else if (
          JSON.stringify(uploaded[key]) !== JSON.stringify(current[key])
        ) {
          updatedFields.push(fullKey);
        } else {
          unchangedFields.push(fullKey);
        }
      });
    };

    checkFields(uploadedData, currentData);
    return {
      new: newFields,
      updated: updatedFields,
      unchanged: unchangedFields,
    };
  };

  const differences =
    uploadedData && currentData ? getFieldDifferences() : null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Upload Specifications JSON
          </DialogTitle>
          <DialogDescription>
            Upload a JSON file to update car specifications. You can either
            merge with existing data or replace it entirely.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!uploadedData && (
            <JsonUpload
              onJsonParsed={handleJsonParsed}
              onError={handleUploadError}
              buttonText="Select JSON File"
              className="w-full"
            />
          )}

          {uploadError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-sm text-destructive">{uploadError}</span>
            </div>
          )}

          {uploadedData && (
            <div className="space-y-4">
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="comparison">Comparison</TabsTrigger>
                  <TabsTrigger value="options">Apply Options</TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="space-y-4">
                  {renderJsonPreview(uploadedData, "Uploaded JSON Data")}
                </TabsContent>

                <TabsContent value="comparison" className="space-y-4">
                  {differences && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        {renderJsonPreview(currentData, "Current Data")}
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Changes Summary</h4>

                        {differences.new.length > 0 && (
                          <div>
                            <Badge variant="default" className="mb-2">
                              {differences.new.length} New Fields
                            </Badge>
                            <ScrollArea className="h-20 w-full">
                              <div className="text-xs space-y-1">
                                {differences.new.map((field) => (
                                  <div
                                    key={field}
                                    className="text-green-600 dark:text-green-400"
                                  >
                                    + {field}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}

                        {differences.updated.length > 0 && (
                          <div>
                            <Badge variant="secondary" className="mb-2">
                              {differences.updated.length} Updated Fields
                            </Badge>
                            <ScrollArea className="h-20 w-full">
                              <div className="text-xs space-y-1">
                                {differences.updated.map((field) => (
                                  <div
                                    key={field}
                                    className="text-yellow-600 dark:text-yellow-400"
                                  >
                                    ~ {field}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}

                        {differences.unchanged.length > 0 && (
                          <div>
                            <Badge variant="outline" className="mb-2">
                              {differences.unchanged.length} Unchanged Fields
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="options" className="space-y-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Apply Mode</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          applyMode === "merge"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setApplyMode("merge")}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Merge className="w-4 h-4" />
                          <span className="font-medium">Merge</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Add new fields and update existing ones. Keeps fields
                          not in the JSON.
                        </p>
                      </div>

                      <div
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          applyMode === "replace"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setApplyMode("replace")}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Replace className="w-4 h-4" />
                          <span className="font-medium">Replace</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Replace all specifications with the JSON data. May
                          remove existing fields.
                        </p>
                      </div>
                    </div>

                    {applyMode === "replace" && (
                      <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-sm text-yellow-800 dark:text-yellow-200">
                          Warning: Replace mode will overwrite all existing
                          specifications.
                        </span>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {uploadedData && (
            <Button onClick={handleApply}>
              {applyMode === "merge" ? "Merge" : "Replace"} Specifications
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
