"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  FileText,
  Calendar,
  Filter,
  AlertCircle,
  Check,
  X,
} from "lucide-react";

import { useAPIQuery } from "@/hooks/useAPIQuery";
import { CopySelectorProps, SelectedCopy, CaptionAPIResponse } from "./types";

/**
 * CopySelector - Component for selecting existing copy from the database
 *
 * This component reuses the existing caption API endpoints from UnifiedCopywriter
 * to allow users to browse and select existing copy for enhancement in Content Studio.
 */
export function CopySelector({
  carId,
  projectId,
  onCopySelect,
  selectedCopies,
}: CopySelectorProps) {
  // State for filtering and search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Determine API endpoint based on context (following UnifiedCopywriter patterns)
  const apiEndpoint = useMemo(() => {
    if (projectId) {
      return `projects/${projectId}/captions`;
    } else if (carId) {
      return `captions`;
    }
    return null;
  }, [projectId, carId]);

  // Build query URL with parameters
  const queryUrl = useMemo(() => {
    if (!apiEndpoint) return "captions"; // fallback endpoint that won't be used

    const baseUrl = apiEndpoint;
    const params = new URLSearchParams();

    // Add carId for car mode (projects already have it in the path)
    if (carId && !projectId) {
      params.append("carId", carId);
    }

    params.append("page", page.toString());
    params.append("limit", limit.toString());

    if (searchTerm.trim()) {
      params.append("search", searchTerm.trim());
    }

    if (selectedType !== "all") {
      params.append("type", selectedType);
    }

    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }, [apiEndpoint, carId, projectId, page, limit, searchTerm, selectedType]);

  // Fetch captions using the same pattern as UnifiedCopywriter
  const {
    data: captionsResponse,
    isLoading,
    error,
    refetch,
  } = useAPIQuery<any>(queryUrl, {
    enabled: Boolean(apiEndpoint),
    staleTime: 30 * 1000, // 30 seconds cache
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Handle both array and paginated response formats
  const captions = useMemo(() => {
    if (!captionsResponse) return [];

    // If response is an array (like UnifiedCopywriter expects)
    if (Array.isArray(captionsResponse)) {
      return captionsResponse;
    }

    // If response has captions property (paginated format)
    if (captionsResponse.captions && Array.isArray(captionsResponse.captions)) {
      return captionsResponse.captions;
    }

    // Fallback to empty array
    return [];
  }, [captionsResponse]);

  // Parse articles as full content instead of splitting into paragraphs
  const articleChunks = useMemo(() => {
    const chunks: Array<{
      id: string;
      text: string;
      type: string;
      originalArticleId: string;
      originalTitle: string;
      carId?: string;
      projectId?: string;
      metadata?: any;
      createdAt: Date;
    }> = [];

    captions.forEach((article: any) => {
      const fullText = article.text || article.caption || "";
      const articleType = article.type || article.platform || "unknown";

      // Only include articles with substantial content
      if (fullText.trim() && fullText.trim().length > 20) {
        chunks.push({
          id: `${article._id}-full`,
          text: fullText,
          type: `${articleType} Article`,
          originalArticleId: article._id,
          originalTitle: `${articleType} Article`,
          carId: article.carId,
          projectId: article.projectId,
          metadata: {
            ...article.metadata,
            isFullArticle: true,
          },
          createdAt: new Date(article.createdAt),
        });
      }
    });

    return chunks;
  }, [captions]);

  const totalCount = useMemo(() => {
    if (!captionsResponse) return 0;

    // If paginated response
    if (captionsResponse.total !== undefined) {
      return captionsResponse.total;
    }

    // Return total article chunks count
    return articleChunks.length;
  }, [captionsResponse, articleChunks]);

  // Get unique caption types for filtering
  const captionTypes = useMemo(() => {
    const types = new Set<string>();
    articleChunks.forEach((chunk: any) => {
      if (chunk.type) types.add(chunk.type);
    });
    return Array.from(types).sort();
  }, [articleChunks]);

  // Handle individual copy selection
  const handleCopyToggle = (chunk: any) => {
    const copy: SelectedCopy = {
      id: chunk.id,
      text: chunk.text,
      type: chunk.type,
      carId: chunk.carId,
      projectId: chunk.projectId,
      metadata: {
        ...chunk.metadata,
        originalArticleId: chunk.originalArticleId,
      },
      createdAt: chunk.createdAt,
    };

    const isSelected = selectedCopies.some((c) => c.id === copy.id);

    if (isSelected) {
      // Remove from selection
      const updated = selectedCopies.filter((c) => c.id !== copy.id);
      onCopySelect(updated);
    } else {
      // Add to selection
      const updated = [...selectedCopies, copy];
      onCopySelect(updated);
    }
  };

  // Handle select all visible
  const handleSelectAllVisible = () => {
    const visibleCopies: SelectedCopy[] = filteredChunks.map((chunk: any) => ({
      id: chunk.id,
      text: chunk.text,
      type: chunk.type,
      carId: chunk.carId,
      projectId: chunk.projectId,
      metadata: {
        ...chunk.metadata,
        originalArticleId: chunk.originalArticleId,
      },
      createdAt: chunk.createdAt,
    }));

    // Add all visible copies that aren't already selected
    const existingIds = new Set(selectedCopies.map((c) => c.id));
    const newCopies = visibleCopies.filter((copy) => !existingIds.has(copy.id));

    if (newCopies.length > 0) {
      onCopySelect([...selectedCopies, ...newCopies]);
    }
  };

  // Handle clear selection
  const handleClearSelection = () => {
    onCopySelect([]);
  };

  // Filter and search logic - now works on article chunks
  const filteredChunks = useMemo(() => {
    return articleChunks.filter((chunk: any) => {
      const text = chunk.text || "";
      const type = chunk.type || "";

      const matchesSearch =
        !searchTerm ||
        text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        type.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = selectedType === "all" || type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [articleChunks, searchTerm, selectedType]);

  if (!apiEndpoint) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No context provided. Please ensure this component is used within a car
          or project tab.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Select Copy to Enhance</h3>
            <p className="text-sm text-muted-foreground">
              Choose existing copy from your {projectId ? "project" : "car"} to
              enhance with multimedia elements
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {selectedCopies.length > 0 && (
              <>
                <Badge variant="secondary" className="px-3">
                  {selectedCopies.length} selected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearSelection}
                  className="text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search copy text or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {captionTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filteredChunks.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllVisible}
                className="whitespace-nowrap"
              >
                <Check className="h-3 w-3 mr-1" />
                Select All
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load copy: {error.message}
          </AlertDescription>
        </Alert>
      ) : filteredChunks.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="font-medium">No copy found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || selectedType !== "all"
                  ? "No copy matches your current filters"
                  : "No copy available for this " +
                    (projectId ? "project" : "car")}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Available Copy ({filteredChunks.length})</span>
              <span className="text-sm font-normal text-muted-foreground">
                Page {page} of {Math.ceil(totalCount / limit)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {filteredChunks.map((chunk: any, index: number) => {
                  const isSelected = selectedCopies.some(
                    (c) => c.id === chunk.id
                  );

                  const displayText = chunk.text || "";
                  const displayType = chunk.type || "Unknown";

                  return (
                    <div key={chunk.id} className="space-y-2">
                      <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleCopyToggle(chunk)}
                          className="mt-1"
                        />

                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              {displayType}
                            </Badge>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(chunk.createdAt).toLocaleDateString()}
                            </div>
                          </div>

                          <p className="text-sm leading-relaxed">
                            {displayText}
                          </p>
                        </div>
                      </div>

                      {index < filteredChunks.length - 1 && <Separator />}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Pagination (if needed) */}
            {totalCount > limit && (
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>

                <span className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1} to{" "}
                  {Math.min(page * limit, totalCount)} of {totalCount}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(totalCount / limit)}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
