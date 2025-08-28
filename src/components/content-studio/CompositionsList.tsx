"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Archive, Edit3, Loader2, Trash2, Copy, Plus } from "lucide-react";
import { useAPIQuery } from "@/hooks/useAPIQuery";
import { api } from "@/lib/api-client";
import { LoadedComposition } from "./types";

interface CompositionsListProps {
  carId?: string;
  projectId?: string;
  onLoadComposition: (composition: LoadedComposition) => void;
  onRefetch?: (refetchFn: () => void) => void;
  onCreateNew?: () => void; // New prop for creating blank compositions
}

export function CompositionsList({
  carId,
  projectId,
  onLoadComposition,
  onRefetch,
  onCreateNew,
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

  // Expose refetch function to parent component
  React.useEffect(() => {
    if (onRefetch) {
      onRefetch(refetch);
    }
  }, [onRefetch, refetch]);

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
    <div className="space-y-4">
      {/* Simplified Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Archive className="h-5 w-5" />
          <span className="font-medium">Saved Compositions</span>
          {!isLoading && compositions.length > 0 && (
            <Badge variant="secondary" className="bg-muted/20">
              {compositions.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={onCreateNew}
            variant="default"
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
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
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm text-muted-foreground">
              Loading compositions...
            </span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && compositions.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto bg-muted/20 rounded-full flex items-center justify-center mb-4">
            <Archive className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-2">No Compositions Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Create your first composition using the Copy Selection and Block
            Composer tabs.
          </p>
        </div>
      )}

      {/* Compositions Table */}
      {!isLoading && compositions.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compositions.map((composition) => (
                <TableRow
                  key={composition._id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => onLoadComposition(composition)}
                >
                  <TableCell className="font-medium">
                    {composition.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {composition.type || "email"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(composition.metadata?.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLoadComposition(composition);
                        }}
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Edit3 className="h-3 w-3 mr-1" />
                        Load
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(composition);
                        }}
                        variant="outline"
                        size="sm"
                        className="bg-transparent border-border/40 hover:bg-muted/20"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(composition._id);
                        }}
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
