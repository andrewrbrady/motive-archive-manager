"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  Suspense,
} from "react";
import { useAPI } from "@/hooks/useAPI";
import { FileText, Trash2, Upload, Loader2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import MarkdownViewer from "./MarkdownViewer";
import { ModelSelector, ModelType } from "@/components/ModelSelector";
import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/ui/loading";

// Dynamically import MarkdownEditor with no SSR
const MarkdownEditor = dynamic(() => import("./MarkdownEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  ),
});

interface ResearchFile {
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
}

interface ResearchFilesProps {
  carId: string;
}

export default function ResearchFiles({ carId }: ResearchFilesProps) {
  const api = useAPI();
  const [files, setFiles] = useState<ResearchFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ResearchFile | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      content: string;
      metadata: {
        fileId: string;
        fileName: string;
        matchType: "keyword" | "semantic" | "both";
        score: number;
      };
    }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchAnswer, setSearchAnswer] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelType>("gpt-4o-mini");
  const [isEditing, setIsEditing] = useState(false);
  const [fileListBounce, setFileListBounce] = useState<"top" | "bottom" | null>(
    null
  );
  const [contentBounce, setContentBounce] = useState<"top" | "bottom" | null>(
    null
  );
  const fileListBounceTimeout = useRef<NodeJS.Timeout>();
  const contentBounceTimeout = useRef<NodeJS.Timeout>();
  const [isVimMode, setIsVimMode] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const fileListRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!api) return; // Guard inside hook
    fetchFiles();
  }, [carId, api]);

  const fetchFiles = async () => {
    if (!api) {
      setIsLoadingFiles(false);
      return;
    }

    setIsLoadingFiles(true);
    try {
      const data = (await api.get(`cars/${carId}/research`)) as {
        files: ResearchFile[];
      };
      setFiles(data.files || []);
    } catch (error) {
      console.error("Error fetching research files:", error);
      setError("Failed to load research files");
    } finally {
      setIsLoadingFiles(false);
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
    const validFiles = droppedFiles.filter((file) =>
      file.name.toLowerCase().endsWith(".md")
    );

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      setError(null);
    } else {
      setError("Only markdown (.md) files are supported");
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
    processor: (item: T) => Promise<any>
  ) => {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);
    }
    return results;
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !api) return;

    setUploading(true);
    setError(null);
    setUploadProgress({});

    try {
      const processFile = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("carId", carId);

        // Initialize progress for this file
        setUploadProgress((prev) => ({
          ...prev,
          [file.name]: 0,
        }));

        try {
          const response = await api.upload("research/upload", formData);

          // Set progress to 100% when complete
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: 100,
          }));

          return response;
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          throw error;
        }
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

  // Add polling for processing status
  useEffect(() => {
    if (!api) return; // Guard inside hook

    const processingFiles = files.filter(
      (f) => f.processingStatus === "pending"
    );
    if (processingFiles.length === 0) return;

    const pollInterval = setInterval(async () => {
      try {
        const data = (await api.get(`cars/${carId}/research`)) as {
          files: ResearchFile[];
        };
        setFiles(data.files || []);

        // Stop polling if no more pending files
        if (
          !(data.files || []).some(
            (f: ResearchFile) => f.processingStatus === "pending"
          )
        ) {
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error("Error polling file status:", error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [files, carId, api]);

  const handleDelete = async (fileId: string) => {
    if (!api) return;

    try {
      await api.delete(`cars/${carId}/research?fileId=${fileId}`);

      setFiles((prev) => prev.filter((file) => file._id !== fileId));
    } catch (error) {
      console.error("Error deleting file:", error);
      setError("Failed to delete file");
    }
  };

  const handleDeleteAll = async () => {
    if (!files.length || !api) return;

    setIsDeletingAll(true);
    setError(null);

    try {
      await api.delete(`cars/${carId}/research/all`);

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

  const handleFileClick = async (file: ResearchFile) => {
    if (!api) return;

    setIsLoadingContent(true);
    setError(null);
    try {
      const content = (await api.get(
        `cars/${carId}/research/content?fileId=${file._id}`
      )) as string;
      setMarkdownContent(content);
      setSelectedFile({ ...file, content });
      setIsEditing(false);
    } catch (error) {
      console.error("Error loading markdown content:", error);
      setError("Failed to load file content");
      setMarkdownContent("");
      setSelectedFile(null);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleContentSave = async (fileId: string, newContent: string) => {
    if (!selectedFile || selectedFile._id !== fileId) return;
    setMarkdownContent(newContent);
    setSelectedFile({ ...selectedFile, content: newContent });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !api) return;

    setIsSearching(true);
    setError(null);
    setSearchAnswer(null);

    try {
      const data = (await api.get(
        `cars/${carId}/research/search?q=${encodeURIComponent(searchQuery)}&model=${selectedModel}`
      )) as { results: any[]; answer?: string };
      setSearchResults(data.results);
      setSearchAnswer(data.answer || null);
    } catch (error) {
      console.error("Error searching research:", error);
      setError("Failed to search research content");
    } finally {
      setIsSearching(false);
    }
  };

  const handleBounce = (
    element: HTMLDivElement,
    setBounce: (value: "top" | "bottom" | null) => void,
    timeoutRef: React.MutableRefObject<NodeJS.Timeout | undefined>
  ) => {
    const isAtTop = element.scrollTop === 0;
    const isAtBottom =
      Math.abs(
        element.scrollHeight - element.scrollTop - element.clientHeight
      ) < 1;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
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
    timeoutRef.current = setTimeout(() => {
      setBounce(null);
      timeoutRef.current = undefined;
    }, 150);
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

  useEffect(() => {
    // Scroll selected item into view when using keyboard navigation
    if (selectedIndex >= 0 && fileListRef.current) {
      const fileListContainer = fileListRef.current;
      // Find the actual file list div (the one with divide-y class)
      const fileListDiv = fileListContainer.querySelector(
        ".divide-y"
      ) as HTMLElement;
      if (!fileListDiv) return;

      // Find the selected element within the file list
      const selectedElement = fileListDiv.children[
        selectedIndex + 1
      ] as HTMLElement; // +1 to skip the header
      if (!selectedElement) return;

      // Calculate positions relative to the scrollable container
      const containerRect = fileListContainer.getBoundingClientRect();
      const elementRect = selectedElement.getBoundingClientRect();

      // Calculate the relative positions
      const elementTop = elementRect.top - containerRect.top;
      const elementBottom = elementRect.bottom - containerRect.top;

      // Check if element is not fully visible
      if (elementTop < 0 || elementBottom > containerRect.height) {
        // Calculate the new scroll position
        const newScrollTop =
          fileListContainer.scrollTop +
          (elementTop < 0
            ? elementTop // Scroll up if element is above
            : elementBottom - containerRect.height); // Scroll down if element is below

        fileListContainer.scrollTo({
          top: newScrollTop,
          behavior: "smooth",
        });
      }
    }
  }, [selectedIndex]);

  const focusFileList = useCallback(() => {
    fileListRef.current?.focus();
  }, []);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (fileListBounceTimeout.current) {
        clearTimeout(fileListBounceTimeout.current);
      }
      if (contentBounceTimeout.current) {
        clearTimeout(contentBounceTimeout.current);
      }
    };
  }, []);

  // Guard clause for API availability
  if (!api) {
    return (
      <div className="py-8 text-center text-muted-foreground">Loading...</div>
    );
  }

  return (
    <div className="h-[calc(100vh-20rem)] flex flex-col overflow-hidden overscroll-none">
      <div className="flex-1 grid grid-cols-2 min-h-0 divide-x divide-zinc-800">
        {/* Left Column */}
        <div className="flex flex-col min-h-0">
          {/* Search and Upload Section */}
          <div className="flex-none px-1.5 py-0.5 border-b border-[hsl(var(--border))] bg-background z-20">
            <div className="flex gap-1 mb-0.5 relative">
              <div className="flex-1">
                <form onSubmit={handleSearch} className="flex gap-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search research files..."
                    className="w-full bg-background text-text-primary border border-border-primary rounded-md px-1.5 py-0.5 text-sm placeholder:text-text-tertiary"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSearching || !searchQuery.trim()}
                    className="h-6 px-1.5 shrink-0"
                  >
                    {isSearching ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Search"
                    )}
                  </Button>
                </form>
              </div>
              <div className="shrink-0">
                <ModelSelector
                  value={selectedModel}
                  onChange={setSelectedModel}
                  className="w-28"
                />
              </div>
            </div>

            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border border-dashed rounded-md p-0.5 text-center transition-colors ${
                isDragging
                  ? "border-zinc-500 bg-[hsl(var(--background))] bg-opacity-50"
                  : "border-[hsl(var(--border))] hover:border-[hsl(var(--border-subtle))]"
              }`}
            >
              <input
                type="file"
                id="file"
                multiple
                onChange={handleFileSelect}
                accept=".md"
                className="hidden"
              />
              <label
                htmlFor="file"
                className="flex items-center justify-center gap-1 cursor-pointer text-sm"
              >
                <Upload className="h-3 w-3 text-[hsl(var(--foreground-muted))]" />
                <span className="text-[hsl(var(--foreground-muted))]">
                  <span className="font-medium text-[hsl(var(--foreground-subtle))]">
                    Drop files or click
                  </span>{" "}
                  (.md)
                </span>
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-1.5 flex flex-col max-h-32">
                <div className="text-xs text-[hsl(var(--foreground-muted))] px-1">
                  Selected files:
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-zinc-800 mt-1">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-2 text-sm px-1 py-0.5 hover:bg-[hsl(var(--background))] bg-opacity-50"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileText className="h-3 w-3 text-[hsl(var(--foreground-muted))] flex-shrink-0" />
                        <span className="truncate text-[hsl(var(--foreground-subtle))]">
                          {file.name}
                        </span>
                      </div>
                      <span className="text-xs text-[hsl(var(--foreground-muted))] flex-shrink-0">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-1 pt-1 border-t border-[hsl(var(--border))]">
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

          {/* Files and Search Results */}
          <div
            ref={fileListRef}
            tabIndex={0}
            onFocus={() => setIsVimMode(true)}
            onKeyDown={handleFileListKeyDown}
            className={`flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-zinc-800 overscroll-none transition-transform duration-200 focus:outline-none focus:ring-[0.5px] focus:ring-zinc-700/50 ${
              fileListBounce === "top"
                ? "translate-y-[10px]"
                : fileListBounce === "bottom"
                  ? "-translate-y-[10px]"
                  : ""
            }`}
            onScroll={(e) => {
              handleBounce(
                e.currentTarget,
                setFileListBounce,
                fileListBounceTimeout
              );
            }}
            onWheel={(e) => {
              const element = e.currentTarget;
              const isAtTop = element.scrollTop === 0;
              const isAtBottom =
                Math.abs(
                  element.scrollHeight -
                    element.scrollTop -
                    element.clientHeight
                ) < 1;

              if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
                e.preventDefault();
              }
            }}
          >
            {error && (
              <div className="mx-2 mt-1.5 rounded border border-destructive-900 border-opacity-50 bg-destructive-900/10 p-1 text-sm text-destructive-400">
                {error}
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="border-b border-[hsl(var(--border))]">
                <div className="p-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium text-[hsl(var(--foreground-subtle))]">
                      Search Results
                    </h3>
                  </div>
                  {searchAnswer && (
                    <div className="mb-2 p-2 rounded bg-[hsl(var(--background))] bg-opacity-75 text-sm">
                      <div className="font-medium text-zinc-200 mb-1">
                        Answer
                      </div>
                      <div className="text-[hsl(var(--foreground-muted))] whitespace-pre-wrap">
                        {searchAnswer}
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    {searchResults.map((result, index) => (
                      <div
                        key={`${result.metadata.fileId}-${index}`}
                        className="p-1.5 rounded bg-[hsl(var(--background))] bg-opacity-50 hover:bg-[hsl(var(--background))] transition-colors cursor-pointer text-sm"
                        onClick={() => {
                          const file = files.find(
                            (f) => f._id === result.metadata.fileId
                          );
                          if (file) handleFileClick(file);
                        }}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-medium text-zinc-200">
                            {result.metadata.fileName}
                          </span>
                          <span className="text-xs text-[hsl(var(--foreground-muted))]">
                            {result.metadata.matchType}
                          </span>
                        </div>
                        <p className="text-xs text-[hsl(var(--foreground-muted))] line-clamp-2">
                          {result.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="divide-y divide-zinc-800">
              <div className="px-2 py-1 sticky top-0 bg-background z-10 flex items-center justify-between">
                <h3 className="text-sm font-medium text-[hsl(var(--foreground-subtle))]">
                  Research Files
                </h3>
                {files.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteAll}
                    disabled={isDeletingAll}
                    className="h-6 text-xs text-[hsl(var(--foreground-muted))] hover:text-destructive-400 hover:bg-destructive-400 bg-opacity-10"
                  >
                    {isDeletingAll ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>

              {isLoadingFiles ? (
                <div className="p-2 flex justify-center">
                  <LoadingSpinner size="md" />
                </div>
              ) : (
                <>
                  {files.map((file) => (
                    <div
                      key={file._id}
                      className={`group py-4 flex items-start justify-between cursor-pointer hover:bg-[hsl(var(--background))]/50 px-4 -mx-4 rounded ${
                        selectedFile?._id === file._id
                          ? "bg-[hsl(var(--background))] bg-opacity-50"
                          : ""
                      }`}
                      onClick={() => handleFileClick(file)}
                    >
                      <div className="flex gap-4 min-w-0 flex-1">
                        <FileText className="h-5 w-5 mt-0.5 text-[hsl(var(--foreground-muted))] flex-shrink-0" />
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground-subtle))] block truncate">
                              {truncateFilename(file.filename)}
                            </span>
                            {file.processingStatus === "pending" && (
                              <span className="text-xs text-[hsl(var(--foreground-muted))]">
                                <Loader2 className="h-3 w-3 animate-spin inline-block mr-1" />
                                Processing
                              </span>
                            )}
                            {file.processingStatus === "failed" && (
                              <span
                                className="text-xs text-destructive-400"
                                title={file.processingError}
                              >
                                Processing failed
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-[hsl(var(--foreground-muted))]">
                            {formatFileSize(file.size)} •{" "}
                            {formatDistanceToNow(new Date(file.createdAt), {
                              addSuffix: true,
                            })}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(file._id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[hsl(var(--foreground-muted))] hover:text-destructive-400 hover:bg-transparent flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {files.length === 0 && (
                    <div className="py-3 text-center text-[hsl(var(--foreground-muted))] text-sm">
                      <FileText className="h-8 w-8 mx-auto mb-1 opacity-20" />
                      <p>No research files uploaded yet</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Content Viewer */}
        <div className="min-h-0 flex flex-col">
          {selectedFile ? (
            isLoadingContent ? (
              <div className="flex items-center justify-center h-full">
                <LoadingSpinner size="md" />
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {isEditing ? (
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    }
                  >
                    <MarkdownEditor
                      value={selectedFile.content || ""}
                      onChange={(newContent) =>
                        handleContentSave(selectedFile._id, newContent)
                      }
                      readOnly={false}
                    />
                  </Suspense>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex-none px-2 py-1 border-b border-[hsl(var(--border))] bg-background z-10 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                        {selectedFile.filename}
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-[hsl(var(--foreground-muted))]">
                          {isVimMode ? "VIM" : "-- INSERT --"}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditing(true)}
                          className="h-6 text-xs text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))]"
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                    <MarkdownViewer
                      ref={viewerRef}
                      content={markdownContent}
                      filename={selectedFile.filename}
                      onFocusFileList={focusFileList}
                    />
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full text-[hsl(var(--foreground-muted))] text-sm">
              Select a file to view its content
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
