"use client";

import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Eye, Edit2, Save, History, Loader2 } from "lucide-react";
import MarkdownViewer from "./MarkdownViewer";
import { debounce } from "lodash";
import { formatDistanceToNow } from "date-fns";

interface MarkdownEditorProps {
  content: string;
  filename: string;
  fileId: string;
  carId: string;
  lastModified: string;
  onSave?: (content: string) => void;
}

export default function MarkdownEditor({
  content: initialContent,
  filename,
  fileId,
  carId,
  lastModified,
  onSave,
}: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const editorRef = useRef<any>(null);

  // Auto-save functionality
  const debouncedSave = useRef(
    debounce(async (content: string) => {
      if (!isDirty) return;
      await handleSave(content);
    }, 2000)
  ).current;

  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const handleContentChange = (value: string | undefined) => {
    if (!value) return;
    setContent(value);
    setIsDirty(true);
    debouncedSave(value);
  };

  const handleSave = async (contentToSave: string) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/cars/${carId}/research/content`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId,
          content: contentToSave,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save content");
      }

      setLastSaved(new Date());
      setIsDirty(false);
      onSave?.(contentToSave);
    } catch (error) {
      console.error("Error saving content:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSave = () => {
    handleSave(content);
  };

  const togglePreview = () => {
    setIsPreview(!isPreview);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">{filename}</h3>
          <p className="text-sm text-zinc-400">
            Last modified: {formatDistanceToNow(new Date(lastModified))} ago
            {lastSaved && ` • Saved ${formatDistanceToNow(lastSaved)} ago`}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePreview}
            className="flex items-center"
          >
            {isPreview ? (
              <>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSave}
            disabled={isSaving || !isDirty}
            className="flex items-center"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {isPreview ? (
          <MarkdownViewer content={content} filename={filename} />
        ) : (
          <Editor
            height="100%"
            defaultLanguage="markdown"
            value={content}
            onChange={handleContentChange}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: "on",
              lineNumbers: "on",
              renderWhitespace: "boundary",
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        )}
      </div>
    </div>
  );
}
