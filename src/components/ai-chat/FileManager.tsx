"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Edit,
  Trash2,
  Download,
  Search,
  Filter,
  MoreVertical,
  Tag,
  Calendar,
  HardDrive,
  Eye,
  X,
  Check,
  RefreshCw,
  AlertCircle,
  Upload,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { FileUploadDropzone } from "./FileUploadDropzone";

interface AIFile {
  id: string;
  openaiFileId: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  description: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  uploadedBy: string;
}

interface FileManagerProps {
  entityType: "car" | "project";
  entityId: string;
  onFilesChanged?: (fileIds: string[]) => void;
  maxHeight?: string;
  showUpload?: boolean;
}

export function FileManager({
  entityType,
  entityId,
  onFilesChanged,
  maxHeight = "600px",
  showUpload = true,
}: FileManagerProps) {
  const [files, setFiles] = useState<AIFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<AIFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedFile, setSelectedFile] = useState<AIFile | null>(null);
  const [editingFile, setEditingFile] = useState<AIFile | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<AIFile | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [updatingFile, setUpdatingFile] = useState<string | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    originalName: "",
    description: "",
    category: "",
    tags: "",
  });

  const { user, isAuthenticated } = useFirebaseAuth();

  const fetchFiles = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const authToken = await user.getIdToken();
      const response = await fetch(
        `/api/ai-files/upload?entityType=${entityType}&entityId=${entityId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status}`);
      }

      const result = await response.json();
      setFiles(result.files || []);
    } catch (error) {
      console.error("Error fetching files:", error);
      setError(error instanceof Error ? error.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, isAuthenticated, user]);

  // Filter files based on search and category
  useEffect(() => {
    let filtered = files;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (file) =>
          file.originalName.toLowerCase().includes(query) ||
          file.description.toLowerCase().includes(query) ||
          file.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((file) => file.category === categoryFilter);
    }

    setFilteredFiles(filtered);
  }, [files, searchQuery, categoryFilter]);

  // Update parent component when files change
  useEffect(() => {
    if (onFilesChanged) {
      const fileIds = files.map((file) => file.openaiFileId);
      onFilesChanged(fileIds);
    }
  }, [files, onFilesChanged]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleEditFile = (file: AIFile) => {
    setEditingFile(file);
    setEditForm({
      originalName: file.originalName,
      description: file.description,
      category: file.category,
      tags: file.tags.join(", "),
    });
  };

  const handleSaveEdit = async () => {
    if (!editingFile || !user) return;

    try {
      setUpdatingFile(editingFile.id);

      const authToken = await user.getIdToken();
      const response = await fetch(`/api/ai-files/${editingFile.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          originalName: editForm.originalName,
          description: editForm.description,
          category: editForm.category,
          tags: editForm.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update file: ${response.status}`);
      }

      const result = await response.json();

      // Update the file in the list
      setFiles((prev) =>
        prev.map((file) => (file.id === editingFile.id ? result.file : file))
      );

      setEditingFile(null);
      setError(null);
    } catch (error) {
      console.error("Error updating file:", error);
      setError(
        error instanceof Error ? error.message : "Failed to update file"
      );
    } finally {
      setUpdatingFile(null);
    }
  };

  const handleDeleteFile = async (file: AIFile) => {
    if (!user) return;

    try {
      setDeletingFile(file.id);

      const authToken = await user.getIdToken();
      const response = await fetch(`/api/ai-files/${file.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.status}`);
      }

      // Remove file from the list
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      setShowDeleteDialog(null);
      setError(null);
    } catch (error) {
      console.error("Error deleting file:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete file"
      );
    } finally {
      setDeletingFile(null);
    }
  };

  const handleFilesUploaded = (fileIds: string[]) => {
    // Refresh the file list after upload
    fetchFiles();
    setShowUploadDialog(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getUniqueCategories = (): string[] => {
    const categories = files.map((file) => file.category);
    return Array.from(new Set(categories)).filter(Boolean);
  };

  const getCategoryColor = (category: string): string => {
    const colors = {
      general: "bg-gray-100 text-gray-800",
      maintenance: "bg-blue-100 text-blue-800",
      repairs: "bg-red-100 text-red-800",
      documentation: "bg-green-100 text-green-800",
      warranty: "bg-purple-100 text-purple-800",
      insurance: "bg-yellow-100 text-yellow-800",
    };
    return colors[category as keyof typeof colors] || colors.general;
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <FolderOpen className="w-12 h-12 mb-4 opacity-50" />
        <p>Please sign in to manage your files</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          <h3 className="text-lg font-semibold">File Manager</h3>
          <Badge variant="secondary">{files.length} files</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchFiles}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>

          {showUpload && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUploadDialog(true)}
            >
              <Upload className="w-4 h-4 mr-1" />
              Upload Files
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search files, descriptions, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {getUniqueCategories().map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* File List */}
      <div
        className="border rounded-lg bg-background overflow-hidden"
        style={{ maxHeight }}
      >
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading files...</span>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">
              {files.length === 0
                ? "No files uploaded yet"
                : "No files match your filters"}
            </p>
            <p className="text-sm">
              {files.length === 0
                ? `Upload files to get started with AI assistance for this ${entityType}`
                : "Try adjusting your search query or category filter"}
            </p>
          </div>
        ) : (
          <div
            className="divide-y overflow-y-auto"
            style={{ maxHeight: "calc(100% - 1rem)" }}
          >
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="p-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <h4 className="font-medium text-sm truncate">
                        {file.originalName}
                      </h4>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${getCategoryColor(file.category)}`}
                      >
                        {file.category}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        {formatFileSize(file.size)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(file.createdAt)}
                      </span>
                    </div>

                    {file.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {file.description}
                      </p>
                    )}

                    {file.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {file.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs px-1 py-0"
                          >
                            <Tag className="w-2 h-2 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(file)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditFile(file)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setShowDeleteDialog(file)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete File
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File Details Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              File Details
            </DialogTitle>
          </DialogHeader>

          {selectedFile && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    File Name
                  </label>
                  <p className="text-sm">{selectedFile.originalName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Category
                  </label>
                  <Badge className={getCategoryColor(selectedFile.category)}>
                    {selectedFile.category}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    File Size
                  </label>
                  <p className="text-sm">{formatFileSize(selectedFile.size)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    MIME Type
                  </label>
                  <p className="text-sm">{selectedFile.mimeType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Created
                  </label>
                  <p className="text-sm">
                    {formatDate(selectedFile.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Updated
                  </label>
                  <p className="text-sm">
                    {formatDate(selectedFile.updatedAt)}
                  </p>
                </div>
              </div>

              {selectedFile.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Description
                  </label>
                  <p className="text-sm mt-1">{selectedFile.description}</p>
                </div>
              )}

              {selectedFile.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedFile.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  OpenAI File ID
                </label>
                <p className="text-sm font-mono">{selectedFile.openaiFileId}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => selectedFile && handleEditFile(selectedFile)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button onClick={() => setSelectedFile(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit File Dialog */}
      <Dialog open={!!editingFile} onOpenChange={() => setEditingFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit File Details</DialogTitle>
            <DialogDescription>
              Update the metadata for this file. The actual file content cannot
              be changed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">File Name</label>
              <Input
                value={editForm.originalName}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    originalName: e.target.value,
                  }))
                }
                placeholder="Enter file name"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Category</label>
              <Select
                value={editForm.category}
                onValueChange={(value) =>
                  setEditForm((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="repairs">Repairs</SelectItem>
                  <SelectItem value="documentation">Documentation</SelectItem>
                  <SelectItem value="warranty">Warranty</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Enter description"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Tags</label>
              <Input
                value={editForm.tags}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, tags: e.target.value }))
                }
                placeholder="Enter tags separated by commas"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separate multiple tags with commas
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFile(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!!updatingFile}>
              {updatingFile ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!showDeleteDialog}
        onOpenChange={() => setShowDeleteDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Delete File
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{showDeleteDialog?.originalName}
              "? This action cannot be undone and will remove the file from both
              your archive and OpenAI.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                showDeleteDialog && handleDeleteFile(showDeleteDialog)
              }
              disabled={!!deletingFile}
            >
              {deletingFile ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload New Files</DialogTitle>
            <DialogDescription>
              Upload files to be used as context for AI conversations with this{" "}
              {entityType}.
            </DialogDescription>
          </DialogHeader>

          <FileUploadDropzone
            entityType={entityType}
            entityId={entityId}
            onFilesUploaded={handleFilesUploaded}
            onError={(error) => setError(error)}
            maxFiles={10}
            maxFileSize={20}
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUploadDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
