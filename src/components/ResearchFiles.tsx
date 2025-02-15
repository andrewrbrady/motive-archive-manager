"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  Suspense,
} from "react";
import { FileText, Trash2, Upload, Loader2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import MarkdownViewer from "./MarkdownViewer";
import { ModelSelector, ModelType } from "@/components/ModelSelector";
import dynamic from "next/dynamic";

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
}

interface ResearchFilesProps {
  carId: string;
}

export default function ResearchFiles({ carId }: ResearchFilesProps) {
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
    fetchFiles();
  }, [carId]);

  const fetchFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const response = await fetch(`/api/cars/${carId}/research`);
      if (!response.ok) throw new Error("Failed to fetch research files");
      const data = await response.json();
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

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setError(null);
    setUploadProgress({});

    try {
      const uploadPromises = selectedFiles.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("carId", carId);

        // Initialize progress for this file
        setUploadProgress((prev) => ({
          ...prev,
          [file.name]: 0,
        }));

        try {
          const response = await fetch("/api/research/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to upload ${file.name}`);
          }

          // Set progress to 100% when complete
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: 100,
          }));

          const data = await response.json();
          return data;
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: 0,
          }));
          throw error;
        }
      });

      const results = await Promise.allSettled(uploadPromises);

      // Process successful uploads
      const successfulUploads = results
        .filter(
          (result): result is PromiseFulfilledResult<any> =>
            result.status === "fulfilled"
        )
        .map((result) => result.value);

      if (successfulUploads.length > 0) {
        setFiles((prev) => [...prev, ...successfulUploads]);
      }

      // Process failures
      const failures = results
        .filter(
          (result): result is PromiseRejectedResult =>
            result.status === "rejected"
        )
        .map((result) => result.reason);

      if (failures.length > 0) {
        const errorMessage = failures
          .map((error) =>
            error instanceof Error ? error.message : "Upload failed"
          )
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

  const handleDelete = async (fileId: string) => {
    try {
      const response = await fetch(
        `/api/cars/${carId}/research?fileId=${fileId}`,
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
      const response = await fetch(`/api/cars/${carId}/research/all`, {
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

  const handleFileClick = async (file: ResearchFile) => {
    setIsLoadingContent(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/cars/${carId}/research/content?fileId=${file._id}`
      );
      if (!response.ok) throw new Error("Failed to fetch file content");
      const content = await response.text();
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

  const handleContentSave = async (newContent: string) => {
    if (!selectedFile) return;
    setMarkdownContent(newContent);
    setSelectedFile({ ...selectedFile, content: newContent });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    setSearchAnswer(null);

    try {
      const response = await fetch(
        `/api/cars/${carId}/research/search?q=${encodeURIComponent(
          searchQuery
        )}&model=${selectedModel}`
      );

      if (!response.ok) {
        throw new Error("Failed to search research content");
      }

      const data = await response.json();
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

  return (
    <div className="h-[calc(100vh-20rem)] flex flex-col overflow-hidden overscroll-none">
      <div className="flex-1 grid grid-cols-2 min-h-0 divide-x divide-zinc-800">
        {/* Left Column */}
        <div className="flex flex-col min-h-0">
          {/* Search and Upload Section */}
          <div className="flex-none px-1.5 py-0.5 border-b border-zinc-800 bg-background z-20">
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
                  ? "border-zinc-500 bg-zinc-800/50"
                  : "border-zinc-800 hover:border-zinc-700"
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
                <Upload className="h-3 w-3 text-zinc-400" />
                <span className="text-zinc-400">
                  <span className="font-medium text-zinc-300">
                    Drop files or click
                  </span>{" "}
                  (.md)
                </span>
              </label>
            </div>
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
              <div className="mx-2 mt-1.5 rounded border border-red-900/50 bg-red-900/10 p-1 text-sm text-red-400">
                {error}
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="border-b border-zinc-800">
                <div className="p-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium text-zinc-300">
                      Search Results
                    </h3>
                  </div>
                  {searchAnswer && (
                    <div className="mb-2 p-2 rounded bg-zinc-800/75 text-sm">
                      <div className="font-medium text-zinc-200 mb-1">
                        Answer
                      </div>
                      <div className="text-zinc-400 whitespace-pre-wrap">
                        {searchAnswer}
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    {searchResults.map((result, index) => (
                      <div
                        key={`${result.metadata.fileId}-${index}`}
                        className="p-1.5 rounded bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer text-sm"
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
                          <span className="text-xs text-zinc-500">
                            {result.metadata.matchType}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 line-clamp-2">
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
                <h3 className="text-sm font-medium text-zinc-300">
                  Research Files
                </h3>
                {files.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteAll}
                    disabled={isDeletingAll}
                    className="h-6 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-400/10"
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
                  {files.map((file, index) => (
                    <div
                      key={file._id}
                      className={`group py-1.5 px-2 flex items-start justify-between cursor-pointer hover:bg-zinc-800/50 ${
                        selectedFile?._id === file._id ? "bg-zinc-800/50" : ""
                      } ${
                        selectedIndex === index
                          ? "bg-zinc-800/75 ring-[0.5px] ring-zinc-700/50"
                          : ""
                      }`}
                      onClick={() => {
                        setSelectedIndex(index);
                        handleFileClick(file);
                      }}
                    >
                      <div className="flex gap-2 min-w-0 flex-1">
                        <FileText className="h-4 w-4 mt-0.5 text-zinc-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="font-medium text-sm text-zinc-200 hover:text-zinc-100 block truncate">
                            {truncateFilename(file.filename)}
                          </span>
                          <div className="text-xs text-zinc-500">
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
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-400 hover:bg-transparent flex-shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {files.length === 0 && (
                    <div className="py-3 text-center text-zinc-500 text-sm">
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
                <Loader2 className="w-6 h-6 animate-spin" />
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
                      content={selectedFile.content || ""}
                      filename={selectedFile.filename}
                      fileId={selectedFile._id}
                      carId={carId}
                      lastModified={selectedFile.updatedAt}
                      onSave={handleContentSave}
                    />
                  </Suspense>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex-none px-2 py-1 border-b border-zinc-800 bg-background z-10 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-zinc-100 truncate">
                        {selectedFile.filename}
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-zinc-400">
                          {isVimMode ? "VIM" : "-- INSERT --"}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditing(true)}
                          className="h-6 text-xs text-zinc-400 hover:text-zinc-300"
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
            <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
              Select a file to view its content
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
