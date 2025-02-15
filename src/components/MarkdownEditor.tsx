"use client";

import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Eye, Edit2, Save, History, Loader2 } from "lucide-react";
import MarkdownViewer from "./MarkdownViewer";
import { debounce } from "lodash";
import { formatDistanceToNow } from "date-fns";
import * as monaco from "monaco-editor";
import { initVimMode } from "monaco-vim";

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
  const [bounce, setBounce] = useState<"top" | "bottom" | null>(null);
  const [isVimMode, setIsVimMode] = useState(true);
  const bounceTimeout = useRef<NodeJS.Timeout>();
  const editorRef = useRef<any>(null);
  const vimModeRef = useRef<any>(null);
  const statusBarRef = useRef<HTMLDivElement>(null);

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
      if (bounceTimeout.current) {
        clearTimeout(bounceTimeout.current);
      }
      if (vimModeRef.current) {
        vimModeRef.current.dispose();
      }
    };
  }, [debouncedSave]);

  useEffect(() => {
    if (editorRef.current && statusBarRef.current) {
      if (isVimMode && !vimModeRef.current) {
        vimModeRef.current = initVimMode(
          editorRef.current,
          statusBarRef.current
        );
      } else if (!isVimMode && vimModeRef.current) {
        vimModeRef.current.dispose();
        vimModeRef.current = null;
      }
    }
  }, [isVimMode, editorRef.current]);

  const handleBounce = (element: HTMLDivElement) => {
    const isAtTop = element.scrollTop === 0;
    const isAtBottom =
      Math.abs(
        element.scrollHeight - element.scrollTop - element.clientHeight
      ) < 1;

    // Clear any existing timeout
    if (bounceTimeout.current) {
      clearTimeout(bounceTimeout.current);
      bounceTimeout.current = undefined;
    }

    // Reset bounce state when not at boundaries
    if (!isAtTop && !isAtBottom) {
      setBounce(null);
      return;
    }

    // Set bounce state based on position
    if (isAtTop) {
      setBounce("top");
    } else if (isAtBottom) {
      setBounce("bottom");
    }

    // Clear bounce state after animation
    bounceTimeout.current = setTimeout(() => {
      setBounce(null);
      bounceTimeout.current = undefined;
    }, 150);
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    if (isVimMode && statusBarRef.current) {
      vimModeRef.current = initVimMode(editor, statusBarRef.current);
    }
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
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none flex items-center justify-between px-2 py-1 border-b border-zinc-800 bg-background z-10">
        <div className="min-w-0 flex-1 mr-4">
          <h3 className="text-sm font-medium text-zinc-100 truncate">
            {filename}
          </h3>
          <p className="text-xs text-zinc-400 truncate">
            Last modified: {formatDistanceToNow(new Date(lastModified))} ago
            {lastSaved && ` • Saved ${formatDistanceToNow(lastSaved)} ago`}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsVimMode(!isVimMode)}
            className="h-6 text-xs shrink-0"
          >
            {isVimMode ? "Vim: On" : "Vim: Off"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={togglePreview}
            className="h-6 text-xs shrink-0"
          >
            {isPreview ? (
              <>
                <Edit2 className="h-3 w-3 mr-1" />
                Edit
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSave}
            disabled={isSaving || !isDirty}
            className="h-6 text-xs shrink-0"
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3" />
            ) : (
              <>
                <Save className="h-3 w-3 mr-1" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {isPreview ? (
          <div className="h-full overflow-hidden">
            <div className="flex flex-col h-full">
              <div
                className={`flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-zinc-800 overscroll-none transition-transform duration-200 ${
                  bounce === "top"
                    ? "translate-y-[10px]"
                    : bounce === "bottom"
                    ? "-translate-y-[10px]"
                    : ""
                }`}
                onScroll={(e) => handleBounce(e.currentTarget)}
                onWheel={(e) => {
                  const element = e.currentTarget;
                  const isAtTop = element.scrollTop === 0;
                  const isAtBottom =
                    Math.abs(
                      element.scrollHeight -
                        element.scrollTop -
                        element.clientHeight
                    ) < 1;

                  if (
                    (isAtTop && e.deltaY < 0) ||
                    (isAtBottom && e.deltaY > 0)
                  ) {
                    e.preventDefault();
                  }
                }}
              >
                <MarkdownViewer content={content} filename={filename} />
              </div>
            </div>
          </div>
        ) : (
          <>
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
                cursorStyle: isVimMode ? "block" : "line",
              }}
            />
            <div
              ref={statusBarRef}
              className="flex-none h-5 px-2 text-xs text-zinc-400 bg-zinc-900 border-t border-zinc-800"
            />
          </>
        )}
      </div>
    </div>
  );
}
