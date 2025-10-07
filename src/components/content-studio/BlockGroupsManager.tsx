"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Archive,
  Plus,
  Search,
  Loader2,
  Clock,
  Trash2,
  Download,
  Package,
} from "lucide-react";

import { useBlockGroups, BlockGroup } from "@/hooks/useBlockGroups";
import { ContentBlock } from "./types";

interface BlockGroupsManagerProps {
  children: React.ReactNode; // The trigger button
  currentBlocks: ContentBlock[];
  activeBlockId: string | null;
  onBlocksChange: (blocks: ContentBlock[]) => void;
  projectId?: string;
  carId?: string;
}

/**
 * BlockGroupsManager - Component for managing saved block groups
 * Allows users to save current block selections as reusable groups
 * and insert saved block groups into the current composition
 */
export const BlockGroupsManager = React.memo<BlockGroupsManagerProps>(
  function BlockGroupsManager({
    children,
    currentBlocks,
    activeBlockId,
    onBlocksChange,
    projectId,
    carId,
  }) {
    const {
      blockGroups,
      loading,
      selectedBlockIds,
      saveBlockGroup,
      insertBlockGroup,
      deleteBlockGroup,
      toggleBlockSelection,
      clearBlockSelection,
      selectAllBlocks,
      getSelectedBlocks,
      loadBlockGroups,
    } = useBlockGroups();

    // State for popover and dialogs
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [groupDescription, setGroupDescription] = useState("");
    const [saving, setSaving] = useState(false);

    // Filter block groups based on search
    const filteredBlockGroups = blockGroups.filter(
      (group) =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handle saving selected blocks as a group
    const handleSaveBlockGroup = useCallback(async () => {
      if (!groupName.trim()) return;

      setSaving(true);
      const selectedBlocks = getSelectedBlocks(currentBlocks);

      const success = await saveBlockGroup(
        groupName,
        groupDescription,
        selectedBlocks,
        projectId,
        carId
      );

      if (success) {
        setGroupName("");
        setGroupDescription("");
        setShowSaveDialog(false);
        clearBlockSelection();
      }
      setSaving(false);
    }, [
      groupName,
      groupDescription,
      getSelectedBlocks,
      currentBlocks,
      saveBlockGroup,
      projectId,
      carId,
      clearBlockSelection,
    ]);

    // Handle inserting a block group
    const handleInsertBlockGroup = useCallback(
      async (blockGroup: BlockGroup) => {
        await insertBlockGroup(
          blockGroup,
          currentBlocks,
          onBlocksChange,
          activeBlockId
        );
        setIsOpen(false);
      },
      [insertBlockGroup, currentBlocks, onBlocksChange, activeBlockId]
    );

    // Handle deleting a block group
    const handleDeleteBlockGroup = useCallback(
      async (blockGroupId: string) => {
        await deleteBlockGroup(blockGroupId);
      },
      [deleteBlockGroup]
    );

    // Handle block selection toggle
    const handleBlockSelectionToggle = useCallback(
      (blockId: string) => {
        toggleBlockSelection(blockId);
      },
      [toggleBlockSelection]
    );

    const selectedBlocks = getSelectedBlocks(currentBlocks);
    const hasSelection = selectedBlocks.length > 0;

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          className="w-[40rem] max-w-[98vw] max-h-[70vh] overflow-y-auto overflow-x-hidden p-0"
          side="top"
          align="center"
          sideOffset={10}
        >
          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Block Groups</h3>
              <Badge variant="outline" className="text-xs">
                {blockGroups.length} saved
              </Badge>
            </div>

            <Tabs
              defaultValue={blockGroups.length ? "saved" : "select"}
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="select">Select Blocks</TabsTrigger>
                <TabsTrigger value="saved">Saved Groups</TabsTrigger>
              </TabsList>

              <TabsContent value="select" className="mt-0 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Select blocks to save as group:
                    </span>
                    <div className="flex gap-1">
                      <Button
                        onClick={() => selectAllBlocks(currentBlocks.map((b) => b.id))}
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                      >
                        All
                      </Button>
                      <Button
                        onClick={clearBlockSelection}
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {currentBlocks.map((block) => (
                      <div
                        key={block.id}
                        className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer transition-colors ${
                          selectedBlockIds.has(block.id)
                            ? "bg-primary/10 border-primary/20"
                            : "bg-muted/30 hover:bg-muted/50"
                        }`}
                        onClick={() => handleBlockSelectionToggle(block.id)}
                      >
                        <div
                          className={`w-3 h-3 rounded border ${
                            selectedBlockIds.has(block.id)
                              ? "bg-primary border-primary"
                              : "border-muted-foreground"
                          }`}
                        />
                        <span className="flex-1 truncate">
                          {block.type === "text"
                            ? block.content.substring(0, 50) +
                              (block.content.length > 50 ? "..." : "")
                            : block.type === "image"
                              ? `Image: ${(block as any).altText || "Untitled"}`
                              : `${block.type.charAt(0).toUpperCase() + block.type.slice(1)} Block`}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {block.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {hasSelection && (
                  <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        <Package className="h-4 w-4 mr-2" />
                        Save Selected as Group ({selectedBlocks.length})
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Save Block Group</DialogTitle>
                        <DialogDescription>
                          Save {selectedBlocks.length} selected blocks as a
                          reusable group.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="group-name">Group Name</Label>
                          <Input
                            id="group-name"
                            placeholder="Enter group name..."
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="group-description">
                            Description (optional)
                          </Label>
                          <Textarea
                            id="group-description"
                            placeholder="Describe this block group..."
                            value={groupDescription}
                            onChange={(e) => setGroupDescription(e.target.value)}
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowSaveDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSaveBlockGroup}
                          disabled={!groupName.trim() || saving}
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Package className="h-4 w-4 mr-2" />
                          )}
                          Save Group
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </TabsContent>

              <TabsContent value="saved" className="mt-0 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search block groups..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-8 text-sm"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Saved Groups:
                    </span>
                    <Button
                      onClick={() => loadBlockGroups()}
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Refresh"
                      )}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {loading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-xs text-muted-foreground">
                          Loading...
                        </span>
                      </div>
                    ) : filteredBlockGroups.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-4">
                        {searchTerm
                          ? "No groups match your search"
                          : "No saved block groups"}
                      </div>
                    ) : (
                      filteredBlockGroups.map((group) => (
                        <div
                          key={group._id}
                          className="border rounded-lg p-3 space-y-2 bg-background hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">
                                {group.name}
                              </h4>
                              {group.description && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {group.description}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Button
                                onClick={() => handleInsertBlockGroup(group)}
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                title="Insert blocks"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-destructive hover:text-destructive"
                                    title="Delete group"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Block Group
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{group.name}"
                                      ? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteBlockGroup(group._id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">
                              {group.blocks.length} blocks
                            </Badge>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Used {group.metadata.usageCount} times
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {[...new Set(group.blocks.map((b) => b.type))].map(
                              (type) => (
                                <Badge
                                  key={type}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {type}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);
