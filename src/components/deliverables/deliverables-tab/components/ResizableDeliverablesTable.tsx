import React, { useState, useEffect } from "react";
import {
  ResizableTable,
  ResizableTableBody,
  ResizableTableRow,
  ResizableTableCell,
} from "@/components/ui/resizable-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckSquare,
  Square,
  Copy,
  Trash2,
  CheckCircle,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  RotateCcw,
  Check,
  X,
} from "lucide-react";

import { Deliverable } from "@/types/deliverable";
import { DeliverableActions, BatchModeState } from "../types";
import { safeFormat, formatDeliverableDuration } from "../utils";
import { StatusSelector } from "../../StatusSelector";
import { useCarDetails } from "@/contexts/CarDetailsContext";
import { MediaTypeSelector } from "../../MediaTypeSelector";
import { EditorSelector } from "../../EditorSelector";
import { PlatformSelector } from "../../PlatformSelector";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "@/components/ui/use-toast";

interface ResizableDeliverablesTableProps {
  deliverables: Deliverable[];
  isLoading: boolean;
  actions: DeliverableActions;
  batchMode: BatchModeState;
  showCarColumn?: boolean;
  onOpenModal?: (deliverable: Deliverable) => void;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (field: string) => void;
}

// Column width presets
const DEFAULT_COLUMN_WIDTHS = {
  checkbox: 50,
  title: 200,
  car: 180,
  platform: 140,
  mediaType: 120,
  status: 100,
  duration: 80,
  editor: 140,
  edit_deadline: 120,
  release_date: 120,
  scheduled: 80,
  actions: 100,
};

const COLUMN_WIDTHS_STORAGE = "deliverables-table-column-widths";

export default function ResizableDeliverablesTable({
  deliverables,
  isLoading,
  actions,
  batchMode,
  showCarColumn = false,
  onOpenModal,
  sortField,
  sortDirection,
  onSort,
}: ResizableDeliverablesTableProps) {
  const { getCarDetails } = useCarDetails();
  const api = useAPI();
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    () => {
      // Load saved column widths from localStorage
      try {
        const saved = localStorage.getItem(COLUMN_WIDTHS_STORAGE);
        return saved ? JSON.parse(saved) : DEFAULT_COLUMN_WIDTHS;
      } catch {
        return DEFAULT_COLUMN_WIDTHS;
      }
    }
  );

  // State for inline editing
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState<string>("");

  const {
    isBatchMode,
    selectedDeliverables,
    toggleDeliverableSelection,
    toggleAllDeliverables,
  } = batchMode;

  // Save column widths to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(COLUMN_WIDTHS_STORAGE, JSON.stringify(columnWidths));
    } catch (error) {
      console.warn("Failed to save column widths:", error);
    }
  }, [columnWidths]);

  const handleColumnResize = (columnKey: string, width: number) => {
    setColumnWidths((prev) => ({
      ...prev,
      [columnKey]: width,
    }));
  };

  const resetColumnWidths = () => {
    setColumnWidths(DEFAULT_COLUMN_WIDTHS);
    localStorage.removeItem(COLUMN_WIDTHS_STORAGE);
  };

  // Inline editing handlers
  const handleTitleClick = (e: React.MouseEvent, deliverable: Deliverable) => {
    e.stopPropagation(); // Prevent row click from opening modal
    setEditingTitleId(deliverable._id?.toString() || "");
    setEditingTitleValue(deliverable.title || "");
  };

  const handleTitleSave = async (deliverableId: string) => {
    if (!editingTitleValue.trim() || !api) {
      return; // Don't save empty titles or if API not available
    }

    const newTitle = editingTitleValue.trim();

    try {
      // Optimistic update - update UI immediately
      if (actions.onUpdate) {
        actions.onUpdate(deliverableId, { title: newTitle });
      }

      setEditingTitleId(null);
      setEditingTitleValue("");

      // Make API call in background
      await api.put(`deliverables/${deliverableId}`, {
        title: newTitle,
      });

      toast({
        title: "Success",
        description: "Title updated successfully",
      });
    } catch (error) {
      console.error("Error updating title:", error);

      // Revert optimistic update on error
      if (actions.onUpdate) {
        const originalDeliverable = deliverables.find(
          (d) => d._id?.toString() === deliverableId
        );
        if (originalDeliverable) {
          actions.onUpdate(deliverableId, { title: originalDeliverable.title });
        }
      }

      toast({
        title: "Error",
        description: "Failed to update title",
        variant: "destructive",
      });
    }
  };

  const handleTitleCancel = () => {
    setEditingTitleId(null);
    setEditingTitleValue("");
  };

  const handleTitleKeyDown = (
    e: React.KeyboardEvent,
    deliverableId: string
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleTitleSave(deliverableId);
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleTitleCancel();
    }
  };

  // Helper function to render sortable table header
  const renderSortableHeader = (field: string, label: string) => {
    if (!onSort) {
      return label;
    }

    const isActive = sortField === field;
    const Icon = isActive
      ? sortDirection === "asc"
        ? ChevronUp
        : ChevronDown
      : ChevronsUpDown;

    return (
      <button
        className="flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => onSort(field)}
      >
        <span>{label}</span>
        <Icon className="h-3 w-3" />
      </button>
    );
  };

  const renderCell = (deliverable: Deliverable, field: keyof Deliverable) => {
    const value = deliverable[field];

    if (field === "title") {
      const deliverableId = deliverable._id?.toString() || "";
      const isEditing = editingTitleId === deliverableId;

      if (isEditing) {
        return (
          <div className="flex items-center gap-1 w-full">
            <Input
              value={editingTitleValue}
              onChange={(e) => setEditingTitleValue(e.target.value)}
              onKeyDown={(e) => handleTitleKeyDown(e, deliverableId)}
              onBlur={() => handleTitleSave(deliverableId)}
              className="text-sm h-7 px-2"
              autoFocus
            />
            <div className="flex gap-1 flex-shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTitleSave(deliverableId);
                }}
              >
                <Check className="h-3 w-3 text-green-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTitleCancel();
                }}
              >
                <X className="h-3 w-3 text-red-600" />
              </Button>
            </div>
          </div>
        );
      }

      return (
        <div
          className="cursor-pointer flex items-center gap-1 hover:bg-muted/20 rounded px-1 py-0.5 transition-colors"
          onClick={(e) => handleTitleClick(e, deliverable)}
          title="Click to edit title"
        >
          <span className="truncate">{value?.toString() || ""}</span>
        </div>
      );
    }

    if (field === "edit_deadline" || field === "release_date") {
      return (
        <div className="cursor-pointer flex items-center gap-1">
          <span className="truncate">
            {value ? safeFormat(value, "MMM d, yyyy") : "Not set"}
          </span>
        </div>
      );
    }

    if (field === "duration") {
      return (
        <div className="cursor-pointer">
          {formatDeliverableDuration(deliverable)}
        </div>
      );
    }

    if (field === "status") {
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <StatusSelector
            deliverableId={deliverable._id?.toString() || ""}
            initialStatus={deliverable.status}
            size="sm"
            onStatusChange={(newStatus) =>
              actions.onStatusChange(
                deliverable._id?.toString() || "",
                newStatus
              )
            }
          />
        </div>
      );
    }

    if (field === "scheduled") {
      return (
        <div className="cursor-pointer flex justify-center">
          {deliverable.scheduled ? (
            <div title="Scheduled">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          ) : (
            <div className="h-4 w-4" />
          )}
        </div>
      );
    }

    if (field === "mediaType") {
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <MediaTypeSelector
            deliverableId={deliverable._id?.toString() || ""}
            initialMediaTypeId={deliverable.mediaTypeId?.toString()}
            size="sm"
          />
        </div>
      );
    }

    if (field === "editor") {
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <EditorSelector
            deliverableId={deliverable._id?.toString() || ""}
            initialEditor={deliverable.editor}
            size="sm"
          />
        </div>
      );
    }

    if (field === "platform") {
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <PlatformSelector
            deliverableId={deliverable._id?.toString() || ""}
            initialPlatformId={deliverable.platform_id?.toString()}
            size="sm"
          />
        </div>
      );
    }

    return <div className="cursor-pointer">{value?.toString() || ""}</div>;
  };

  // Configure columns
  const columns = [
    ...(isBatchMode
      ? [
          {
            key: "checkbox",
            header: (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAllDeliverables}
                className="p-0"
              >
                {isBatchMode ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </Button>
            ),
            defaultWidth: columnWidths.checkbox,
            minWidth: 40,
            maxWidth: 80,
          },
        ]
      : []),
    {
      key: "title",
      header: renderSortableHeader("title", "Title"),
      defaultWidth: columnWidths.title,
      minWidth: 120,
      maxWidth: 400,
    },
    ...(showCarColumn
      ? [
          {
            key: "car",
            header: renderSortableHeader("car", "Car"),
            defaultWidth: columnWidths.car,
            minWidth: 120,
            maxWidth: 250,
          },
        ]
      : []),
    {
      key: "platform",
      header: renderSortableHeader("platform", "Platform"),
      defaultWidth: columnWidths.platform,
      minWidth: 100,
      maxWidth: 200,
    },
    {
      key: "mediaType",
      header: renderSortableHeader("mediaType", "Media Type"),
      defaultWidth: columnWidths.mediaType,
      minWidth: 100,
      maxWidth: 180,
    },
    {
      key: "status",
      header: renderSortableHeader("status", "Status"),
      defaultWidth: columnWidths.status,
      minWidth: 80,
      maxWidth: 150,
    },
    {
      key: "duration",
      header: renderSortableHeader("duration", "Duration"),
      defaultWidth: columnWidths.duration,
      minWidth: 60,
      maxWidth: 120,
    },
    {
      key: "editor",
      header: renderSortableHeader("editor", "Editor"),
      defaultWidth: columnWidths.editor,
      minWidth: 100,
      maxWidth: 200,
    },
    {
      key: "edit_deadline",
      header: renderSortableHeader("edit_deadline", "Deadline"),
      defaultWidth: columnWidths.edit_deadline,
      minWidth: 100,
      maxWidth: 150,
    },
    {
      key: "release_date",
      header: renderSortableHeader("release_date", "Release Date"),
      defaultWidth: columnWidths.release_date,
      minWidth: 100,
      maxWidth: 150,
    },
    {
      key: "scheduled",
      header: renderSortableHeader("scheduled", "Scheduled"),
      defaultWidth: columnWidths.scheduled,
      minWidth: 60,
      maxWidth: 100,
    },
    {
      key: "actions",
      header: (
        <div className="flex items-center justify-between">
          <span>Actions</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetColumnWidths}
            className="p-1 h-auto ml-2"
            title="Reset column widths"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      ),
      defaultWidth: columnWidths.actions,
      minWidth: 80,
      maxWidth: 150,
      resizable: false, // Don't allow resizing the actions column
    },
  ];

  const getColumnCount = () => {
    let count = 10; // Base columns
    if (isBatchMode) count += 1; // Checkbox column
    if (showCarColumn) count += 1; // Car column
    return count;
  };

  return (
    <div className="hidden md:block rounded-b-md border border-t-0 w-full">
      <ResizableTable
        columns={columns}
        onColumnResize={handleColumnResize}
        className="table-fixed"
      >
        <ResizableTableBody>
          {isLoading ? (
            <ResizableTableRow>
              <ResizableTableCell
                colSpan={getColumnCount()}
                className="text-center py-8"
              >
                Loading deliverables...
              </ResizableTableCell>
            </ResizableTableRow>
          ) : deliverables.length === 0 ? (
            <ResizableTableRow>
              <ResizableTableCell
                colSpan={getColumnCount()}
                className="text-center py-8"
              >
                No deliverables found. Create your first one!
              </ResizableTableCell>
            </ResizableTableRow>
          ) : (
            deliverables.map((deliverable) => {
              const carInfo =
                showCarColumn && deliverable.car_id
                  ? getCarDetails(deliverable.car_id.toString())
                  : null;

              return (
                <ResizableTableRow
                  key={deliverable._id?.toString()}
                  className={
                    onOpenModal ? "cursor-pointer hover:bg-muted/50" : ""
                  }
                  onClick={() => onOpenModal?.(deliverable)}
                >
                  {isBatchMode && (
                    <ResizableTableCell columnKey="checkbox">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDeliverableSelection(
                            deliverable._id?.toString() || ""
                          );
                        }}
                        className="p-0"
                      >
                        {selectedDeliverables.includes(
                          deliverable._id?.toString() || ""
                        ) ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                    </ResizableTableCell>
                  )}
                  <ResizableTableCell columnKey="title" className="font-medium">
                    {renderCell(deliverable, "title")}
                  </ResizableTableCell>
                  {showCarColumn && (
                    <ResizableTableCell columnKey="car">
                      {carInfo ? (
                        <div className="truncate">
                          {carInfo.year} {carInfo.make} {carInfo.model}
                        </div>
                      ) : (
                        "Unknown"
                      )}
                    </ResizableTableCell>
                  )}
                  <ResizableTableCell columnKey="platform">
                    {renderCell(deliverable, "platform")}
                  </ResizableTableCell>
                  <ResizableTableCell columnKey="mediaType">
                    {renderCell(deliverable, "mediaType")}
                  </ResizableTableCell>
                  <ResizableTableCell columnKey="status">
                    {renderCell(deliverable, "status")}
                  </ResizableTableCell>
                  <ResizableTableCell columnKey="duration">
                    {renderCell(deliverable, "duration")}
                  </ResizableTableCell>
                  <ResizableTableCell columnKey="editor">
                    {renderCell(deliverable, "editor")}
                  </ResizableTableCell>
                  <ResizableTableCell columnKey="edit_deadline">
                    {renderCell(deliverable, "edit_deadline")}
                  </ResizableTableCell>
                  <ResizableTableCell columnKey="release_date">
                    {renderCell(deliverable, "release_date")}
                  </ResizableTableCell>
                  <ResizableTableCell columnKey="scheduled">
                    {renderCell(deliverable, "scheduled")}
                  </ResizableTableCell>
                  <ResizableTableCell columnKey="actions">
                    <div
                      className="flex justify-end items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!isBatchMode && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => actions.onDuplicate(deliverable)}
                            className="text-muted-foreground hover:text-foreground"
                            title="Duplicate deliverable"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              actions.onDelete(
                                deliverable._id?.toString() || ""
                              )
                            }
                            className="text-destructive-500 hover:text-destructive-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </ResizableTableCell>
                </ResizableTableRow>
              );
            })
          )}
        </ResizableTableBody>
      </ResizableTable>
    </div>
  );
}
