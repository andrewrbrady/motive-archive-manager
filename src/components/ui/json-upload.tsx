"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, Check } from "lucide-react";
import { toast } from "react-hot-toast";

interface JsonUploadProps {
  onJsonParsed: (data: any) => void;
  onError?: (error: string) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in bytes
  className?: string;
  buttonText?: string;
  buttonVariant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "destructive";
  disabled?: boolean;
}

export function JsonUpload({
  onJsonParsed,
  onError,
  acceptedFileTypes = [".json"],
  maxFileSize = 5 * 1024 * 1024, // 5MB default
  className = "",
  buttonText = "Upload JSON",
  buttonVariant = "outline",
  disabled = false,
}: JsonUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    if (!file) return;

    // Validate file type
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!acceptedFileTypes.includes(fileExtension)) {
      const error = `Invalid file type. Please upload a ${acceptedFileTypes.join(" or ")} file.`;
      onError?.(error);
      toast.error(error);
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      const error = `File too large. Maximum size is ${(maxFileSize / 1024 / 1024).toFixed(1)}MB.`;
      onError?.(error);
      toast.error(error);
      return;
    }

    setIsProcessing(true);
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const jsonData = JSON.parse(content);

        onJsonParsed(jsonData);
        toast.success(`Successfully parsed ${file.name}`);
      } catch (error) {
        const errorMessage = `Invalid JSON format: ${error instanceof Error ? error.message : "Unknown error"}`;
        onError?.(errorMessage);
        toast.error(errorMessage);
        setUploadedFileName(null);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      const error = "Failed to read file";
      onError?.(error);
      toast.error(error);
      setIsProcessing(false);
      setUploadedFileName(null);
    };

    reader.readAsText(file);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const clearUploadedFile = () => {
    setUploadedFileName(null);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFileTypes.join(",")}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      <div
        className={`
          border-2 border-dashed rounded-lg p-4 transition-colors
          ${
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!disabled ? handleButtonClick : undefined}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          {uploadedFileName ? (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Check className="w-4 h-4" />
              <span>{uploadedFileName}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  clearUploadedFile();
                }}
                className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {isProcessing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                ) : (
                  <FileText className="w-4 h-4 text-muted-foreground" />
                )}
                <Upload className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Drop JSON file here or click to browse</p>
                <p className="text-xs mt-1">
                  Max size: {(maxFileSize / 1024 / 1024).toFixed(1)}MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-2">
        <Button
          variant={buttonVariant}
          size="sm"
          onClick={handleButtonClick}
          disabled={disabled || isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              {buttonText}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
