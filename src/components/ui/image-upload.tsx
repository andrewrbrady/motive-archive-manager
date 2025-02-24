"use client";

import { useRef } from "react";
import { Button } from "./button";
import { Plus } from "lucide-react";

interface ImageUploadProps {
  onUpload: (files: FileList) => void;
  multiple?: boolean;
}

export function ImageUpload({ onUpload, multiple = true }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        Upload Images
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => e.target.files && onUpload(e.target.files)}
      />
    </>
  );
}
