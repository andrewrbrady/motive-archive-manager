import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  CheckSquare,
  Square,
  Cloud,
  Share2,
  Copy,
  Trash2,
  CheckCircle,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { Deliverable } from "@/types/deliverable";
import { DeliverableActions, BatchModeState } from "../types";
import { safeFormat, formatDeliverableDuration } from "../utils";
import { StatusSelector } from "../../StatusSelector";
import YouTubeUploadHelper from "../../YouTubeUploadHelper";
import EditDeliverableForm from "../../EditDeliverableForm";
import { PlatformBadges } from "../../PlatformBadges";
import { useCarDetails } from "@/contexts/CarDetailsContext";

interface DeliverablesTableProps {
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

export default function DeliverablesTable({
  deliverables,
  isLoading,
  actions,
  batchMode,
  showCarColumn = false,
  onOpenModal,
  sortField,
  sortDirection,
  onSort,
}: DeliverablesTableProps) {
  const { getCarDetails } = useCarDetails();

  const {
    isBatchMode,
    selectedDeliverables,
    toggleDeliverableSelection,
    toggleAllDeliverables,
  } = batchMode;

  // Helper function to render sortable table header
  const renderSortableHeader = (
    field: string,
    label: string,
    className?: string
  ) => {
    if (!onSort) {
      return <TableHead className={className}>{label}</TableHead>;
    }

    const isActive = sortField === field;
    const Icon = isActive
      ? sortDirection === "asc"
        ? ChevronUp
        : ChevronDown
      : ChevronsUpDown;

    return (
      <TableHead className={className}>
        <button
          className="flex items-center gap-1 hover:text-foreground transition-colors"
          onClick={() => onSort(field)}
        >
          <span>{label}</span>
          <Icon className="h-3 w-3" />
        </button>
      </TableHead>
    );
  };

  const renderCell = (deliverable: Deliverable, field: keyof Deliverable) => {
    const value = deliverable[field];

    if (field === "title") {
      return (
        <div className="cursor-pointer flex items-center gap-1">
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

    return <div className="cursor-pointer">{value?.toString() || ""}</div>;
  };

  const getColumnCount = () => {
    let count = 9; // Base columns including Scheduled column
    if (isBatchMode) count += 1; // Checkbox column
    if (showCarColumn) count += 1; // Car column
    return count;
  };

  return (
    <div className="hidden md:block rounded-b-md border border-t-0 w-full overflow-x-auto">
      <Table className="w-full table-fixed">
        <TableHeader>
          <TableRow>
            {isBatchMode && (
              <TableHead className="w-12 whitespace-nowrap px-2 py-1.5 text-xs font-medium">
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
              </TableHead>
            )}
            {renderSortableHeader(
              "title",
              "Title",
              "w-[12%] px-2 py-1.5 text-xs font-medium"
            )}
            {showCarColumn &&
              renderSortableHeader(
                "car",
                "Car",
                "w-[13%] px-2 py-1.5 text-xs font-medium"
              )}
            {renderSortableHeader(
              "platform",
              "Platform",
              "w-[12%] px-2 py-1.5 text-xs font-medium"
            )}
            {renderSortableHeader(
              "status",
              "Status",
              "w-[10%] px-2 py-1.5 text-xs font-medium"
            )}
            {renderSortableHeader(
              "duration",
              "Duration",
              "w-[8%] px-2 py-1.5 text-xs font-medium"
            )}
            {renderSortableHeader(
              "editor",
              "Editor",
              "w-[11%] px-2 py-1.5 text-xs font-medium"
            )}
            {renderSortableHeader(
              "edit_deadline",
              "Deadline",
              "w-[7%] px-2 py-1.5 text-xs font-medium"
            )}
            {renderSortableHeader(
              "release_date",
              "Release Date",
              "w-[7%] px-2 py-1.5 text-xs font-medium"
            )}
            {renderSortableHeader(
              "scheduled",
              "Scheduled",
              "w-[3%] px-2 py-1.5 text-xs font-medium text-center"
            )}
            <TableHead className="w-[6%] text-right px-2 py-1.5 text-xs font-medium">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={getColumnCount()}
                className="text-center py-8 text-xs"
              >
                Loading deliverables...
              </TableCell>
            </TableRow>
          ) : deliverables.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={getColumnCount()}
                className="text-center py-8 text-xs"
              >
                No deliverables found. Create your first one!
              </TableCell>
            </TableRow>
          ) : (
            deliverables.map((deliverable) => {
              const carInfo =
                showCarColumn && deliverable.car_id
                  ? getCarDetails(deliverable.car_id.toString())
                  : null;

              return (
                <TableRow
                  key={deliverable._id?.toString()}
                  className={
                    onOpenModal ? "cursor-pointer hover:bg-muted/50" : ""
                  }
                  onClick={() => onOpenModal?.(deliverable)}
                >
                  {isBatchMode && (
                    <TableCell className="px-2 py-1.5">
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
                    </TableCell>
                  )}
                  <TableCell className="px-2 py-1.5 text-xs font-medium">
                    {renderCell(deliverable, "title")}
                  </TableCell>
                  {showCarColumn && (
                    <TableCell className="px-2 py-1.5 text-xs">
                      {carInfo ? (
                        <div className="truncate">
                          {carInfo.year} {carInfo.make} {carInfo.model}
                        </div>
                      ) : (
                        "Unknown"
                      )}
                    </TableCell>
                  )}
                  <TableCell className="px-2 py-1.5 text-xs">
                    <PlatformBadges
                      platform={deliverable.platform}
                      platforms={deliverable.platforms}
                      maxVisible={2}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-xs">
                    {renderCell(deliverable, "status")}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-xs">
                    {renderCell(deliverable, "duration")}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-xs">
                    {renderCell(deliverable, "editor")}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-xs">
                    {renderCell(deliverable, "edit_deadline")}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-xs">
                    {renderCell(deliverable, "release_date")}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-xs">
                    {renderCell(deliverable, "scheduled")}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
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
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
