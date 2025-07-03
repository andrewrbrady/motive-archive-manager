import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api-client";
import { ContentBlock } from "@/components/content-studio/types";

export interface BlockGroup {
  _id: string;
  name: string;
  description: string;
  blocks: ContentBlock[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    usageCount: number;
    lastUsedAt?: string;
  };
}

export interface BlockGroupsState {
  blockGroups: BlockGroup[];
  loading: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function useBlockGroups() {
  const { toast } = useToast();

  // State management
  const [blockGroupsState, setBlockGroupsState] = useState<BlockGroupsState>({
    blockGroups: [],
    loading: false,
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
    },
  });

  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(
    new Set()
  );

  // Load block groups from API
  const loadBlockGroups = useCallback(
    async (search?: string, page = 1) => {
      setBlockGroupsState((prev) => ({ ...prev, loading: true }));

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
        });

        if (search) {
          params.append("search", search);
        }

        const response = (await api.get(
          `/api/content-studio/block-groups?${params}`
        )) as {
          blockGroups: BlockGroup[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };

        setBlockGroupsState({
          blockGroups: response.blockGroups,
          loading: false,
          pagination: response.pagination,
        });
      } catch (error) {
        console.error("Failed to load block groups:", error);
        setBlockGroupsState((prev) => ({ ...prev, loading: false }));
        toast({
          title: "Load Failed",
          description: "Failed to load saved block groups. Please try again.",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  // Save current selection as a block group
  const saveBlockGroup = useCallback(
    async (
      name: string,
      description: string,
      blocks: ContentBlock[],
      projectId?: string,
      carId?: string
    ) => {
      try {
        const blockGroupData = {
          name,
          description,
          blocks: blocks.map((block) => ({
            ...block,
            // Generate new IDs for the blocks to avoid conflicts when inserting
            id: `${block.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          })),
          metadata: {
            projectId,
            carId,
            blockCount: blocks.length,
            blockTypes: [...new Set(blocks.map((b) => b.type))],
          },
        };

        await api.post("/api/content-studio/block-groups", blockGroupData);

        toast({
          title: "Block Group Saved",
          description: `"${name}" has been saved as a reusable block group.`,
        });

        // Refresh the list
        await loadBlockGroups();

        return true;
      } catch (error) {
        console.error("Failed to save block group:", error);
        toast({
          title: "Save Failed",
          description: "Failed to save block group. Please try again.",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast, loadBlockGroups]
  );

  // Insert a block group into the current composition
  const insertBlockGroup = useCallback(
    async (
      blockGroup: BlockGroup,
      currentBlocks: ContentBlock[],
      onBlocksChange: (blocks: ContentBlock[]) => void,
      activeBlockId: string | null
    ) => {
      try {
        // Track usage
        await api.patch(`/api/content-studio/block-groups/${blockGroup._id}`);

        // Find insertion point
        const activeIndex = activeBlockId
          ? currentBlocks.findIndex((block) => block.id === activeBlockId)
          : -1;

        const insertIndex =
          activeIndex >= 0 ? activeIndex + 1 : currentBlocks.length;

        // Prepare blocks with new IDs and updated order
        const newBlocks = blockGroup.blocks.map((block, index) => ({
          ...block,
          id: `${block.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          order: insertIndex + index,
        }));

        // Create updated blocks array
        const beforeBlocks = currentBlocks.slice(0, insertIndex);
        const afterBlocks = currentBlocks.slice(insertIndex).map((block) => ({
          ...block,
          order: block.order + newBlocks.length,
        }));

        const updatedBlocks = [...beforeBlocks, ...newBlocks, ...afterBlocks];

        // Update the composition
        onBlocksChange(updatedBlocks);

        toast({
          title: "Block Group Inserted",
          description: `Added ${newBlocks.length} blocks from "${blockGroup.name}".`,
        });

        // Refresh block groups to update usage count
        await loadBlockGroups();
      } catch (error) {
        console.error("Failed to insert block group:", error);
        toast({
          title: "Insert Failed",
          description: "Failed to insert block group. Please try again.",
          variant: "destructive",
        });
      }
    },
    [toast, loadBlockGroups]
  );

  // Delete a block group
  const deleteBlockGroup = useCallback(
    async (blockGroupId: string) => {
      try {
        await api.delete(`/api/content-studio/block-groups/${blockGroupId}`);

        toast({
          title: "Block Group Deleted",
          description: "Block group has been deleted successfully.",
        });

        // Refresh the list
        await loadBlockGroups();

        return true;
      } catch (error) {
        console.error("Failed to delete block group:", error);
        toast({
          title: "Delete Failed",
          description: "Failed to delete block group. Please try again.",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast, loadBlockGroups]
  );

  // Block selection management for saving as group
  const toggleBlockSelection = useCallback((blockId: string) => {
    setSelectedBlockIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(blockId)) {
        newSet.delete(blockId);
      } else {
        newSet.add(blockId);
      }
      return newSet;
    });
  }, []);

  const clearBlockSelection = useCallback(() => {
    setSelectedBlockIds(new Set());
  }, []);

  const selectAllBlocks = useCallback((blockIds: string[]) => {
    setSelectedBlockIds(new Set(blockIds));
  }, []);

  const getSelectedBlocks = useCallback(
    (allBlocks: ContentBlock[]) => {
      return allBlocks.filter((block) => selectedBlockIds.has(block.id));
    },
    [selectedBlockIds]
  );

  // Auto-load block groups on mount
  useEffect(() => {
    loadBlockGroups();
  }, [loadBlockGroups]);

  return {
    // State
    blockGroups: blockGroupsState.blockGroups,
    loading: blockGroupsState.loading,
    pagination: blockGroupsState.pagination,
    selectedBlockIds,

    // Operations
    loadBlockGroups,
    saveBlockGroup,
    insertBlockGroup,
    deleteBlockGroup,

    // Selection management
    toggleBlockSelection,
    clearBlockSelection,
    selectAllBlocks,
    getSelectedBlocks,
  };
}
