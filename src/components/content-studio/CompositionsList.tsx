"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import {
  Archive,
  Edit3,
  Calendar,
  FileText,
  Loader2,
  Trash2,
  Copy,
  Download,
  Palette,
} from "lucide-react";
import { useAPIQuery } from "@/hooks/useAPIQuery";
import { api } from "@/lib/api-client";
import { LoadedComposition } from "./types";

interface CompositionsListProps {
  carId?: string;
  projectId?: string;
  onLoadComposition: (composition: LoadedComposition) => void;
}

export function CompositionsList({
  carId,
  projectId,
  onLoadComposition,
}: CompositionsListProps) {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Build query parameters for filtering
  const queryParams = new URLSearchParams();
  if (carId) queryParams.append("carId", carId);
  if (projectId) queryParams.append("projectId", projectId);
  queryParams.append("limit", "50"); // Get more results for now

  const {
    data: compositionsData,
    isLoading,
    error,
    refetch,
  } = useAPIQuery<{
    compositions: LoadedComposition[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>(`content-studio/compositions?${queryParams.toString()}`, {
    staleTime: 1 * 60 * 1000, // 1 minute cache
  });

  const compositions = compositionsData?.compositions || [];

  const handleDelete = async (compositionId: string) => {
    if (!confirm("Are you sure you want to delete this composition?")) {
      return;
    }

    setDeletingId(compositionId);
    try {
      await api.delete(`/content-studio/compositions/${compositionId}`);
      toast({
        title: "Composition Deleted",
        description: "The composition has been deleted successfully.",
      });
      refetch();
    } catch (error) {
      console.error("Error deleting composition:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the composition. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (composition: LoadedComposition) => {
    try {
      // Create a new composition without the _id field
      const { _id, ...compositionWithoutId } = composition;

      const duplicatedComposition = {
        ...compositionWithoutId,
        name: `${composition.name} (Copy)`,
        metadata: {
          ...composition.metadata,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      await api.post("/content-studio/compositions", duplicatedComposition);
      toast({
        title: "Composition Duplicated",
        description: `"${duplicatedComposition.name}" has been created.`,
      });
      refetch();
    } catch (error) {
      console.error("Error duplicating composition:", error);
      toast({
        title: "Duplicate Failed",
        description: "Failed to duplicate the composition. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getBlockSummary = (blocks: LoadedComposition["blocks"]) => {
    if (!blocks || blocks.length === 0) return "No blocks";

    const blockTypes = blocks.reduce((acc: any, block) => {
      acc[block.type] = (acc[block.type] || 0) + 1;
      return acc;
    }, {});

    const summary = Object.entries(blockTypes)
      .map(([type, count]) => `${count} ${type}`)
      .join(", ");

    return summary;
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <Archive className="h-8 w-8 text-red-600" />
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-red-900">
                Error Loading Compositions
              </h3>
              <p className="text-sm text-red-600">
                Failed to load your saved compositions. Please try again.
              </p>
              <Button
                onClick={() => refetch()}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-transparent border border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Archive className="h-5 w-5" />
              <span>Saved Compositions</span>
              {!isLoading && compositions.length > 0 && (
                <Badge variant="secondary" className="bg-muted/20">
                  {compositions.length} compositions
                </Badge>
              )}
            </div>
            <Button
              onClick={() => refetch()}
              variant="ghost"
              size="sm"
              disabled={isLoading}
              className="hover:bg-muted/20"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Refresh"
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        {!isLoading && compositions.length > 0 && (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your saved compositions for this {projectId ? "project" : "car"}.
              Click "Load" to edit a composition in the Block Composer.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Loading your compositions...
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && compositions.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-muted/20 rounded-full flex items-center justify-center">
                <Archive className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">No Compositions Yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  You haven't saved any compositions for this{" "}
                  {projectId ? "project" : "car"} yet. Create your first
                  composition using the Copy Selection and Block Composer tabs.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compositions List */}
      {!isLoading && compositions.length > 0 && (
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {compositions.map((composition) => (
              <Card
                key={composition._id}
                className="bg-transparent border border-border/40 hover:border-border/60 transition-colors"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium text-base">
                            {composition.name}
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {formatDate(composition.metadata?.createdAt)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Palette className="h-3 w-3" />
                              <span>{composition.type || "email"}</span>
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="bg-transparent text-xs"
                        >
                          {composition.blocks?.length || 0} blocks
                        </Badge>
                      </div>

                      {/* Block Summary */}
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <FileText className="h-3 w-3" />
                          <span>{getBlockSummary(composition.blocks)}</span>
                        </div>
                      </div>

                      <Separator />

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => onLoadComposition(composition)}
                            size="sm"
                            className="bg-primary hover:bg-primary/90"
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            Load & Edit
                          </Button>
                          <Button
                            onClick={() => handleDuplicate(composition)}
                            variant="outline"
                            size="sm"
                            className="bg-transparent border-border/40 hover:bg-muted/20"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Duplicate
                          </Button>
                        </div>
                        <Button
                          onClick={() => handleDelete(composition._id)}
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === composition._id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {deletingId === composition._id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
