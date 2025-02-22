import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import {
  FileText,
  Trash2,
  Upload,
  Loader2,
  Edit2,
  Plus,
  Clock,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import MarkdownViewer from "../MarkdownViewer";
import { ModelSelector, ModelType } from "@/components/ModelSelector";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import ScriptTemplates from "./ScriptTemplates";
import { Textarea } from "@/components/ui/textarea";

// Import the ScriptTemplate type
interface ScriptRow {
  id: string;
  time: string;
  video: string;
  audio: string;
  gfx: string;
}

interface ScriptTemplate {
  _id?: string;
  name: string;
  description: string;
  rows: ScriptRow[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Dynamically import MarkdownEditor with no SSR
const MarkdownEditor = dynamic(() => import("../MarkdownEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  ),
});

interface Script {
  _id: string;
  filename: string;
  contentType: string;
  size: number;
  url: string;
  createdAt: string;
  updatedAt: string;
  content?: string;
  processingStatus?: "pending" | "completed" | "failed";
  processingError?: string;
  rows?: ScriptRow[];
  brief?: string;
  duration?: string;
}

interface ScriptsProps {
  carId: string;
}

export default function Scripts({ carId }: ScriptsProps) {
  const [files, setFiles] = useState<Script[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<Script | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isVimMode, setIsVimMode] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const fileListRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isCreatingScript, setIsCreatingScript] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const scriptForm = useForm<{
    filename: string;
  }>({
    defaultValues: {
      filename: "",
    },
  });

  useEffect(() => {
    fetchFiles();
  }, [carId]);

  const fetchFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const response = await fetch(`/api/cars/${carId}/scripts`);
      if (!response.ok) throw new Error("Failed to fetch scripts");
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error("Error fetching scripts:", error);
      setError("Failed to load scripts");
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleCreateScript = async (data: { filename: string }) => {
    try {
      // Create an empty file with default table structure
      const content = `# ${data.filename}

## Brief
Add a brief description of the script here...

## Duration
00:00

## Shot Breakdown

| Time | Video | Audio | GFX |
|------|-------|-------|-----|`;

      const file = new File([content], data.filename, {
        type: "text/plain",
      });

      // Upload the file
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/cars/${carId}/scripts/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to create script");
      }

      await fetchFiles();
      setIsCreatingScript(false);
      scriptForm.reset();
    } catch (error) {
      console.error("Error creating script:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create script"
      );
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(
      (file) =>
        file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")
    );

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      setError(null);
    } else {
      setError("Only text files are supported");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList) {
      const newFiles = Array.from(fileList);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      setError(null);
    }
  };

  const batchProcess = async <T,>(
    items: T[],
    batchSize: number,
    processItem: (item: T) => Promise<any>
  ) => {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((item) =>
          processItem(item).catch((error) => ({
            success: false,
            error,
          }))
        )
      );
      results.push(...batchResults);
    }
    return results;
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const processFile = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`/api/cars/${carId}/scripts/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        return { success: true, data: await response.json() };
      };

      // Process files in batches of 5
      const results = await batchProcess(
        Array.from(selectedFiles),
        5,
        processFile
      );

      // Process failures
      const failures = results.filter((result) => !result.success);

      if (failures.length > 0) {
        const errorMessage = failures
          .map((failure) => failure.error?.message || "Upload failed")
          .join(", ");
        setError(`Some files failed to upload: ${errorMessage}`);
      }

      // Clear selected files regardless of success/failure
      setSelectedFiles([]);
      await fetchFiles();
    } catch (error) {
      console.error("Error in upload process:", error);
      setError(
        error instanceof Error ? error.message : "Failed to upload files"
      );
    } finally {
      setUploading(false);
      // Keep progress visible briefly so users can see completion
      setTimeout(() => setUploadProgress({}), 2000);
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      const response = await fetch(
        `/api/cars/${carId}/scripts?fileId=${fileId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to delete file");

      setFiles((prev) => prev.filter((file) => file._id !== fileId));
    } catch (error) {
      console.error("Error deleting file:", error);
      setError("Failed to delete file");
    }
  };

  const handleDeleteAll = async () => {
    if (!files.length) return;

    setIsDeletingAll(true);
    setError(null);

    try {
      const response = await fetch(`/api/cars/${carId}/scripts/all`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete all files");

      setFiles([]);
      setSelectedFile(null);
      setMarkdownContent("");
    } catch (error) {
      console.error("Error deleting all files:", error);
      setError("Failed to delete all files");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const truncateFilename = (filename: string, maxLength: number = 40) => {
    if (filename.length <= maxLength) return filename;
    const extension = filename.split(".").pop();
    const nameWithoutExt = filename.slice(0, filename.lastIndexOf("."));
    const truncatedName = nameWithoutExt.slice(
      0,
      maxLength - 3 - (extension?.length || 0)
    );
    return `${truncatedName}...${extension ? `.${extension}` : ""}`;
  };

  const handleFileClick = async (file: Script) => {
    setIsLoadingContent(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/cars/${carId}/scripts/content?fileId=${file._id}`
      );
      if (!response.ok) throw new Error("Failed to fetch file content");

      const content = await response.text();
      const rowsHeader = response.headers.get("X-Script-Rows");
      const rows = rowsHeader ? JSON.parse(rowsHeader) : [];

      // Parse brief and duration from content
      const briefMatch = content.match(/## Brief\n([\s\S]*?)\n\n/);
      const durationMatch = content.match(/## Duration\n([\s\S]*?)\n\n/);

      setMarkdownContent(content);
      setSelectedFile({
        ...file,
        content,
        rows,
        brief: briefMatch ? briefMatch[1].trim() : undefined,
        duration: durationMatch ? durationMatch[1].trim() : undefined,
      });
    } catch (error) {
      console.error("Error loading markdown content:", error);
      setError("Failed to load file content");
      setMarkdownContent("");
      setSelectedFile(null);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const formatDuration = (input: string): string => {
    // If input is empty or invalid, return default
    if (!input) return "00:00";

    // Clean the input to only allow digits and colons
    const cleaned = input.replace(/[^\d:]/g, "");

    // If input contains a colon, handle as MM:SS format
    if (cleaned.includes(":")) {
      const [minutes, seconds] = cleaned.split(":");

      // If we only have minutes part while typing
      if (seconds === undefined) {
        return minutes;
      }

      // Convert to numbers, handling invalid/empty values
      let mins = parseInt(minutes) || 0;
      let secs = parseInt(seconds) || 0;

      // Handle overflow of seconds to minutes
      if (secs >= 60) {
        mins += Math.floor(secs / 60);
        secs = secs % 60;
      }

      // Format the time ensuring two digits for both minutes and seconds
      return `${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }

    // If we have a pure number input, treat as total seconds
    if (/^\d+$/.test(cleaned)) {
      const totalSeconds = parseInt(cleaned);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }

    // Return cleaned input for partial typing
    return cleaned;
  };

  const handleContentSave = async (newContent: string) => {
    if (!selectedFile) return;
    try {
      // Parse brief and duration from content
      const briefMatch = newContent.match(/## Brief\n([\s\S]*?)\n\n/);
      const durationMatch = newContent.match(/## Duration\n([\s\S]*?)\n\n/);
      const brief = briefMatch ? briefMatch[1].trim() : selectedFile.brief;
      const duration = durationMatch
        ? formatDuration(durationMatch[1].trim())
        : formatDuration(selectedFile.duration || "");

      // Parse rows from content
      const rows = parseMarkdownToRows(newContent);

      const response = await fetch(`/api/cars/${carId}/scripts/content`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId: selectedFile._id,
          content: newContent,
          rows,
          brief,
          duration,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save content");
      }

      // Update local state with the new values
      setMarkdownContent(newContent);
      setSelectedFile((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          content: newContent,
          rows,
          brief,
          duration,
        };
      });
      toast.success("Content saved successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving content:", error);
      toast.error("Failed to save content");
    }
  };

  const parseMarkdownToRows = (markdown: string): ScriptRow[] => {
    try {
      const rows: ScriptRow[] = [];
      const lines = markdown.split("\n");
      let inTable = false;

      for (const line of lines) {
        if (line.startsWith("| Time | Video | Audio | GFX |")) {
          inTable = true;
          continue;
        }
        if (line.startsWith("|---")) continue;
        if (inTable && line.startsWith("|")) {
          const [_, time, video, audio, gfx] = line
            .split("|")
            .map((s) => s.trim());
          rows.push({
            id: crypto.randomUUID(),
            time,
            video,
            audio,
            gfx,
          });
        }
      }

      return rows;
    } catch (error) {
      console.error("Error parsing markdown to rows:", error);
      return [];
    }
  };

  const convertRowsToMarkdown = (rows: ScriptRow[]): string => {
    return `| Time | Video | Audio | GFX |
|------|-------|-------|-----|
${rows
  .map((row) => `| ${row.time} | ${row.video} | ${row.audio} | ${row.gfx} |`)
  .join("\n")}`;
  };

  const handleRowChange = (
    rowId: string,
    field: keyof ScriptRow,
    value: string
  ) => {
    if (!selectedFile) return;

    const updatedRows = (selectedFile.rows || []).map((row) =>
      row.id === rowId ? { ...row, [field]: value } : row
    );

    setSelectedFile((prev) => (prev ? { ...prev, rows: updatedRows } : null));

    // Update markdown content while preserving brief and duration
    const newContent = `# ${selectedFile.filename}

## Brief
${selectedFile.brief || "Add a brief description of the script here..."}

## Duration
${selectedFile.duration || "00:00"}

## Shot Breakdown

${convertRowsToMarkdown(updatedRows)}`;

    setMarkdownContent(newContent);
  };

  const handleDeleteRow = (rowId: string) => {
    if (!selectedFile) return;

    const updatedRows = (selectedFile.rows || []).filter(
      (row) => row.id !== rowId
    );

    setSelectedFile((prev) => (prev ? { ...prev, rows: updatedRows } : null));

    // Update markdown content while preserving brief and duration
    const newContent = `# ${selectedFile.filename}

## Brief
${selectedFile.brief || "Add a brief description of the script here..."}

## Duration
${selectedFile.duration || "00:00"}

## Shot Breakdown

${convertRowsToMarkdown(updatedRows)}`;

    setMarkdownContent(newContent);
  };

  const handleAddRow = () => {
    if (!selectedFile) return;

    const newRow: ScriptRow = {
      id: crypto.randomUUID(),
      time: "",
      video: "",
      audio: "",
      gfx: "",
    };

    const updatedRows = [...(selectedFile.rows || []), newRow];

    setSelectedFile((prev) => (prev ? { ...prev, rows: updatedRows } : null));

    // Update markdown content while preserving brief and duration
    const newContent = `# ${selectedFile.filename}

## Brief
${selectedFile.brief || "Add a brief description of the script here..."}

## Duration
${selectedFile.duration || "00:00"}

## Shot Breakdown

${convertRowsToMarkdown(updatedRows)}`;

    setMarkdownContent(newContent);
  };

  const handleFileListKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isVimMode) return;

      switch (e.key.toLowerCase()) {
        case "j":
          e.preventDefault();
          if (selectedIndex < files.length - 1) {
            setSelectedIndex(selectedIndex + 1);
          }
          break;
        case "k":
          e.preventDefault();
          if (selectedIndex > 0) {
            setSelectedIndex(selectedIndex - 1);
          }
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          viewerRef.current?.focus();
          break;
        case "g":
          if (e.shiftKey) {
            e.preventDefault();
            setSelectedIndex(files.length - 1);
          } else {
            e.preventDefault();
            setSelectedIndex(0);
          }
          break;
        case "escape":
          setIsVimMode(true);
          break;
        case "i":
          setIsVimMode(false);
          break;
      }
    },
    [files, selectedIndex, isVimMode]
  );

  useEffect(() => {
    // Auto-select first file when files load
    if (files.length > 0 && selectedIndex === -1) {
      setSelectedIndex(0);
    }
  }, [files]);

  // Add new effect to automatically open file when selected
  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < files.length) {
      const selectedFile = files[selectedIndex];
      handleFileClick(selectedFile);
    }
  }, [selectedIndex, files]);

  const focusFileList = useCallback(() => {
    fileListRef.current?.focus();
  }, []);

  const handleApplyTemplate = async (template: ScriptTemplate) => {
    try {
      // Create a new file with a timestamp
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `script-${timestamp}`;

      // Extract duration from template name if available
      const durationMatch = template.name.match(/(\d+)\s*Second/i);
      const duration = durationMatch
        ? `00:${durationMatch[1].padStart(2, "0")}`
        : "00:00";

      // Convert template rows to markdown content
      const content = `# ${template.name}

## Brief
${template.description}

## Duration
${duration}

## Shot Breakdown

| Time | Video | Audio | GFX |
|------|-------|-------|-----|
${template.rows
  .map((row) => `| ${row.time} | ${row.video} | ${row.audio} | ${row.gfx} |`)
  .join("\n")}
`;

      const file = new File([content], filename, { type: "text/plain" });

      // Upload the file
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/cars/${carId}/scripts/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to create script from template");
      }

      const newFile = await response.json();

      // Update the content with rows immediately after upload
      const contentResponse = await fetch(
        `/api/cars/${carId}/scripts/content`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileId: newFile._id,
            content,
            rows: template.rows.map((row) => ({
              ...row,
              id: crypto.randomUUID(), // Generate new IDs for the rows
            })),
          }),
        }
      );

      if (!contentResponse.ok) {
        throw new Error("Failed to update script content");
      }

      await fetchFiles();
      setShowTemplates(false);
      toast.success("Script created from template");
    } catch (error) {
      console.error("Error creating script from template:", error);
      toast.error("Failed to create script from template");
    }
  };

  return (
    <div className="h-[calc(100vh-20rem)] flex flex-col overflow-hidden overscroll-none">
      <div className="flex-1 grid grid-cols-[350px_1fr] min-h-0 divide-x divide-zinc-800">
        {/* Left Column */}
        <div className="flex flex-col min-h-0">
          {/* Upload Section */}
          <div className="flex-none px-1.5 py-0.5 border-b border-zinc-800 bg-background z-20">
            <div className="flex gap-2 mb-2">
              <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-1/2 border-neutral-800 hover:bg-neutral-900"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Templates
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-neutral-900">
                  <DialogHeader>
                    <DialogTitle>Script Templates</DialogTitle>
                  </DialogHeader>
                  <ScriptTemplates onApplyTemplate={handleApplyTemplate} />
                </DialogContent>
              </Dialog>

              <Dialog
                open={isCreatingScript}
                onOpenChange={setIsCreatingScript}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-1/2 border-neutral-800 hover:bg-neutral-900"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Script
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-neutral-900">
                  <DialogHeader>
                    <DialogTitle>Create New Script</DialogTitle>
                  </DialogHeader>
                  <Form {...scriptForm}>
                    <form
                      onSubmit={scriptForm.handleSubmit(handleCreateScript)}
                      className="space-y-4"
                    >
                      <FormField
                        control={scriptForm.control}
                        name="filename"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Filename</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., shoot-notes.md"
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end">
                        <Button type="submit">Create Script</Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border border-dashed rounded-md p-0.5 text-center transition-colors ${
                isDragging
                  ? "border-zinc-500 bg-zinc-800/50"
                  : "border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <input
                type="file"
                id="file"
                multiple
                onChange={handleFileSelect}
                accept=".txt,text/plain"
                className="hidden"
              />
              <label
                htmlFor="file"
                className="flex items-center justify-center gap-1 cursor-pointer text-sm"
              >
                <Upload className="h-3 w-3 text-zinc-400" />
                <span className="text-zinc-400">
                  <span className="font-medium text-zinc-300">
                    Drop files or click
                  </span>{" "}
                  (.txt)
                </span>
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-1.5 flex flex-col max-h-32">
                <div className="text-xs text-zinc-400 px-1">
                  Selected files:
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-zinc-800 mt-1">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-2 text-sm px-1 py-0.5 hover:bg-zinc-800/50"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileText className="h-3 w-3 text-zinc-400 flex-shrink-0" />
                        <span className="truncate text-zinc-300">
                          {file.name}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500 flex-shrink-0">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-1 pt-1 border-t border-zinc-800">
                  <Button
                    size="sm"
                    onClick={handleUpload}
                    disabled={uploading}
                    className="h-6 px-2"
                  >
                    {uploading ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Upload className="h-3 w-3 mr-1" />
                    )}
                    Upload {selectedFiles.length} file
                    {selectedFiles.length !== 1 ? "s" : ""}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Files List */}
          <div
            ref={fileListRef}
            tabIndex={0}
            onFocus={() => setIsVimMode(true)}
            onKeyDown={handleFileListKeyDown}
            className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-zinc-800 overscroll-none focus:outline-none focus:ring-[0.5px] focus:ring-zinc-700/50"
          >
            {error && (
              <div className="mx-2 mt-1.5 rounded border border-red-900/50 bg-red-900/10 p-1 text-sm text-red-400">
                {error}
              </div>
            )}

            {isLoadingFiles ? (
              <div className="p-2">
                <div className="animate-pulse space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-4 w-4 bg-zinc-800 rounded" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 bg-zinc-800 rounded w-3/4" />
                        <div className="h-2 bg-zinc-800 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {files.map((file) => (
                  <div
                    key={file._id}
                    className={`group py-4 flex items-start justify-between cursor-pointer hover:bg-zinc-800/50 px-4 -mx-4 rounded ${
                      selectedFile?._id === file._id ? "bg-zinc-800/50" : ""
                    }`}
                    onClick={() => handleFileClick(file)}
                  >
                    <div className="flex gap-4 min-w-0 flex-1">
                      <FileText className="h-5 w-5 mt-0.5 text-zinc-400 flex-shrink-0" />
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-100 hover:text-zinc-300 block truncate">
                            {truncateFilename(file.filename)}
                          </span>
                          {file.processingStatus === "pending" && (
                            <span className="text-xs text-zinc-500">
                              <Loader2 className="h-3 w-3 animate-spin inline-block mr-1" />
                              Processing
                            </span>
                          )}
                          {file.processingStatus === "failed" && (
                            <span
                              className="text-xs text-red-400"
                              title={file.processingError}
                            >
                              Processing failed
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-zinc-400">
                          {formatFileSize(file.size)} •{" "}
                          {formatDistanceToNow(new Date(file.createdAt), {
                            addSuffix: true,
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(file._id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Right Column - Content Viewer */}
        <div className="min-h-0 flex flex-col">
          {selectedFile ? (
            isLoadingContent ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-none px-2 py-1 border-b border-zinc-800 bg-background z-10 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-zinc-100 truncate">
                    {selectedFile.filename}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                      className="h-6 text-xs text-zinc-400 hover:text-zinc-300"
                    >
                      {isEditing ? (
                        <>Cancel</>
                      ) : (
                        <>
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </>
                      )}
                    </Button>
                    {isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleContentSave(markdownContent)}
                        className="h-6 text-xs text-zinc-400 hover:text-zinc-300"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-zinc-400">
                          Brief
                        </h3>
                        {isEditing ? (
                          <Textarea
                            value={selectedFile.brief ?? ""}
                            onChange={(e) => {
                              const newContent = markdownContent.replace(
                                /## Brief[\s\S]*?\n\n/,
                                `## Brief\n${e.target.value}\n\n`
                              );
                              setMarkdownContent(newContent);
                              setSelectedFile((prev) =>
                                prev ? { ...prev, brief: e.target.value } : null
                              );
                            }}
                            placeholder="Add a brief description of the script here..."
                            className="h-24 bg-neutral-800 border-neutral-700 focus:border-neutral-600 focus-visible:ring-neutral-600 focus-visible:ring-1"
                          />
                        ) : (
                          <p className="text-sm text-zinc-300">
                            {selectedFile.brief || "No brief provided"}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-zinc-400">
                          Duration
                        </h3>
                        {isEditing ? (
                          <Input
                            value={selectedFile.duration ?? ""}
                            onChange={(e) => {
                              const formattedDuration = formatDuration(
                                e.target.value
                              );
                              const newContent = markdownContent.replace(
                                /## Duration[\s\S]*?\n\n/,
                                `## Duration\n${formattedDuration}\n\n`
                              );
                              setMarkdownContent(newContent);
                              setSelectedFile((prev) =>
                                prev
                                  ? { ...prev, duration: formattedDuration }
                                  : null
                              );
                            }}
                            placeholder="00:00"
                            className="bg-neutral-800 border-neutral-700 focus:border-neutral-600 focus-visible:ring-neutral-600 focus-visible:ring-1"
                          />
                        ) : (
                          <p className="text-sm text-zinc-300">
                            {formatDuration(selectedFile.duration || "00:00")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="border border-neutral-800">
                      <table className="w-full border-collapse">
                        <thead className="bg-neutral-900">
                          <tr>
                            <th className="w-28 px-3 py-2 text-left border-b border-r border-neutral-800 font-medium text-sm">
                              Time
                            </th>
                            <th className="px-3 py-2 text-left border-b border-r border-neutral-800 font-medium text-sm">
                              Video
                            </th>
                            <th className="px-3 py-2 text-left border-b border-r border-neutral-800 font-medium text-sm">
                              Audio
                            </th>
                            <th className="px-3 py-2 text-left border-b border-r border-neutral-800 font-medium text-sm">
                              GFX
                            </th>
                            {isEditing && (
                              <th className="w-10 px-2 py-2 border-b border-neutral-800"></th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedFile.rows || []).map((row) => (
                            <tr
                              key={row.id}
                              className="border-b border-neutral-800"
                            >
                              <td className="px-3 py-2 border-r border-neutral-800">
                                {isEditing ? (
                                  <Input
                                    value={row.time}
                                    onChange={(e) =>
                                      handleRowChange(
                                        row.id,
                                        "time",
                                        e.target.value
                                      )
                                    }
                                    className="h-7 bg-transparent border-0 p-0 focus-visible:ring-0 placeholder:text-neutral-500"
                                  />
                                ) : (
                                  <span className="text-sm">{row.time}</span>
                                )}
                              </td>
                              <td className="px-3 py-2 border-r border-neutral-800">
                                {isEditing ? (
                                  <Input
                                    value={row.video}
                                    onChange={(e) =>
                                      handleRowChange(
                                        row.id,
                                        "video",
                                        e.target.value
                                      )
                                    }
                                    className="h-7 bg-transparent border-0 p-0 focus-visible:ring-0 placeholder:text-neutral-500"
                                  />
                                ) : (
                                  <span className="text-sm">{row.video}</span>
                                )}
                              </td>
                              <td className="px-3 py-2 border-r border-neutral-800">
                                {isEditing ? (
                                  <Input
                                    value={row.audio}
                                    onChange={(e) =>
                                      handleRowChange(
                                        row.id,
                                        "audio",
                                        e.target.value
                                      )
                                    }
                                    className="h-7 bg-transparent border-0 p-0 focus-visible:ring-0 placeholder:text-neutral-500"
                                  />
                                ) : (
                                  <span className="text-sm">{row.audio}</span>
                                )}
                              </td>
                              <td className="px-3 py-2 border-r border-neutral-800">
                                {isEditing ? (
                                  <Input
                                    value={row.gfx}
                                    onChange={(e) =>
                                      handleRowChange(
                                        row.id,
                                        "gfx",
                                        e.target.value
                                      )
                                    }
                                    className="h-7 bg-transparent border-0 p-0 focus-visible:ring-0 placeholder:text-neutral-500"
                                  />
                                ) : (
                                  <span className="text-sm">{row.gfx}</span>
                                )}
                              </td>
                              {isEditing && (
                                <td className="px-2 py-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteRow(row.id)}
                                    className="h-7 px-2 hover:bg-neutral-800"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ))}
                          {(!selectedFile.rows ||
                            selectedFile.rows.length === 0) && (
                            <tr className="border-b border-neutral-800">
                              <td
                                colSpan={isEditing ? 5 : 4}
                                className="px-3 py-4 text-center text-sm text-neutral-500"
                              >
                                No rows yet.{" "}
                                {isEditing && "Click 'Add Row' to get started."}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {isEditing && (
                      <div className="p-4">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={handleAddRow}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Row
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
              Select a file to view its content
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
