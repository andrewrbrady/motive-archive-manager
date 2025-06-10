"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterContainer } from "@/components/ui/FilterContainer";
import { ListContainer } from "@/components/ui/ListContainer";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading";
import { useAPI } from "@/hooks/useAPI";
import { MediaTypeForm } from "@/components/admin/media-types/MediaTypeForm";
import { DeleteConfirmDialog } from "@/components/admin/media-types/DeleteConfirmDialog";
import { IMediaType } from "@/models/MediaType";

interface MediaTypesResponse {
  mediaTypes: IMediaType[];
  count: number;
}

export default function MediaTypesContent() {
  const api = useAPI();
  const [mediaTypes, setMediaTypes] = useState<IMediaType[]>([]);
  const [filteredMediaTypes, setFilteredMediaTypes] = useState<IMediaType[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMediaType, setSelectedMediaType] = useState<IMediaType | null>(
    null
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [mediaTypeToDelete, setMediaTypeToDelete] = useState<IMediaType | null>(
    null
  );
  const router = useRouter();

  const filterMediaTypes = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredMediaTypes(mediaTypes);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = mediaTypes.filter(
      (mediaType) =>
        mediaType.name.toLowerCase().includes(query) ||
        mediaType.description?.toLowerCase().includes(query)
    );

    setFilteredMediaTypes(filtered);
  }, [mediaTypes, searchQuery]);

  const fetchMediaTypes = useCallback(async () => {
    if (!api) return;

    try {
      setIsLoading(true);
      console.log("Fetching media types..."); // Debug log
      const data = (await api.get(
        "media-types?includeInactive=true"
      )) as MediaTypesResponse;
      console.log("Media types response:", data); // Debug log
      setMediaTypes(data.mediaTypes);
      setFilteredMediaTypes(data.mediaTypes);
    } catch (error) {
      console.error("Error fetching media types:", error);
      toast({
        title: "Error",
        description: "Failed to fetch media types",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchMediaTypes();
  }, [fetchMediaTypes]);

  useEffect(() => {
    filterMediaTypes();
  }, [mediaTypes, searchQuery, filterMediaTypes]);

  const resetSearch = () => {
    setSearchQuery("");
  };

  const handleCreate = () => {
    setSelectedMediaType(null);
    setIsFormOpen(true);
  };

  const handleEdit = (mediaType: IMediaType) => {
    setSelectedMediaType(mediaType);
    setIsFormOpen(true);
  };

  const handleDelete = (mediaType: IMediaType) => {
    setMediaTypeToDelete(mediaType);
    setIsDeleteDialogOpen(true);
  };

  const handleToggleActive = async (mediaType: IMediaType) => {
    if (!api) return;

    try {
      const updatedMediaType = {
        ...mediaType,
        isActive: !mediaType.isActive,
      };

      await api.put(`media-types/${mediaType._id}`, updatedMediaType);
      await fetchMediaTypes();
      toast({
        title: "Success",
        description: `Media type ${updatedMediaType.isActive ? "activated" : "deactivated"} successfully`,
      });
    } catch (error) {
      console.error("Error toggling media type status:", error);
      toast({
        title: "Error",
        description: "Failed to update media type status",
        variant: "destructive",
      });
    }
  };

  const handleFormSave = async (formData: {
    name: string;
    description: string;
    sortOrder: number;
    isActive: boolean;
  }) => {
    if (!api) return;

    try {
      if (selectedMediaType) {
        // Update existing
        await api.put(`media-types/${selectedMediaType._id}`, formData);
        toast({
          title: "Success",
          description: "Media type updated successfully",
        });
      } else {
        // Create new
        await api.post("media-types", formData);
        toast({
          title: "Success",
          description: "Media type created successfully",
        });
      }

      setIsFormOpen(false);
      setSelectedMediaType(null);
      await fetchMediaTypes();
      router.refresh();
    } catch (error: any) {
      console.error("Error saving media type:", error);
      toast({
        title: "Error",
        description:
          error?.response?.data?.error || "Failed to save media type",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!api || !mediaTypeToDelete) return;

    try {
      await api.delete(`media-types/${mediaTypeToDelete._id}`);
      setIsDeleteDialogOpen(false);
      setMediaTypeToDelete(null);
      await fetchMediaTypes();
      toast({
        title: "Success",
        description: "Media type deleted successfully",
      });
      router.refresh();
    } catch (error: any) {
      console.error("Error deleting media type:", error);
      toast({
        title: "Error",
        description:
          error?.response?.data?.error || "Failed to delete media type",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <FilterContainer>
        <div className="flex-1 min-w-[200px]">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onReset={resetSearch}
            placeholder="Search media types..."
          />
        </div>
        <Button
          onClick={handleCreate}
          variant="outline"
          className="border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Media Type
        </Button>
      </FilterContainer>

      <ListContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  <LoadingSpinner size="md" />
                </TableCell>
              </TableRow>
            ) : filteredMediaTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  <span className="text-muted-foreground">
                    No media types found
                  </span>
                </TableCell>
              </TableRow>
            ) : (
              filteredMediaTypes.map((mediaType) => (
                <TableRow key={String(mediaType._id)}>
                  <TableCell className="font-medium">
                    {mediaType.name}
                  </TableCell>
                  <TableCell>{mediaType.description || "-"}</TableCell>
                  <TableCell>{mediaType.sortOrder}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          mediaType.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {mediaType.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(mediaType.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(mediaType)}
                        title={`${mediaType.isActive ? "Deactivate" : "Activate"} media type`}
                      >
                        {mediaType.isActive ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(mediaType)}
                        title="Edit media type"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(mediaType)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete media type"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ListContainer>

      <MediaTypeForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedMediaType(null);
        }}
        onSave={handleFormSave}
        mediaType={selectedMediaType}
      />

      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setMediaTypeToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        mediaType={mediaTypeToDelete}
      />
    </div>
  );
}
