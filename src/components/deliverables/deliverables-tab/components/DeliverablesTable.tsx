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
import { CheckSquare, Square, Cloud, Share2, Copy, Trash2 } from "lucide-react";
import { Deliverable } from "@/types/deliverable";
import { DeliverableActions, BatchModeState } from "../types";
import { safeFormat, formatDeliverableDuration } from "../utils";
import { StatusSelector } from "../../StatusSelector";
import YouTubeUploadHelper from "../../YouTubeUploadHelper";
import EditDeliverableForm from "../../EditDeliverableForm";

interface DeliverablesTableProps {
  deliverables: Deliverable[];
  isLoading: boolean;
  actions: DeliverableActions;
  batchMode: BatchModeState;
  showCarColumn?: boolean;
  getCarInfo?: (deliverable: Deliverable) => {
    make: string;
    model: string;
    year: number;
  } | null;
}

export default function DeliverablesTable({
  deliverables,
  isLoading,
  actions,
  batchMode,
  showCarColumn = false,
  getCarInfo,
}: DeliverablesTableProps) {
  const {
    isBatchMode,
    selectedDeliverables,
    toggleDeliverableSelection,
    toggleAllDeliverables,
  } = batchMode;

  const renderCell = (deliverable: Deliverable, field: keyof Deliverable) => {
    const value = deliverable[field];

    if (field === "edit_deadline" || field === "release_date") {
      return (
        <div className="cursor-pointer">
          {value ? safeFormat(value, "MMM d, yyyy") : "Not set"}
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
        <StatusSelector
          deliverableId={deliverable._id?.toString() || ""}
          initialStatus={deliverable.status}
          size="sm"
          onStatusChange={(newStatus) =>
            actions.onStatusChange(deliverable._id?.toString() || "", newStatus)
          }
        />
      );
    }

    return <div className="cursor-pointer">{value?.toString() || ""}</div>;
  };

  const getColumnCount = () => {
    let count = 9; // Base columns
    if (isBatchMode) count += 1; // Checkbox column
    if (showCarColumn) count += 1; // Car column
    return count;
  };

  return (
    <div className="hidden md:block rounded-md border w-full overflow-x-auto">
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
                  {selectedDeliverables.length === deliverables.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </Button>
              </TableHead>
            )}
            <TableHead className="w-[15%] px-2 py-1.5 text-xs font-medium">
              Title
            </TableHead>
            {showCarColumn && (
              <TableHead className="w-[12%] px-2 py-1.5 text-xs font-medium">
                Car
              </TableHead>
            )}
            <TableHead className="w-[15%] px-2 py-1.5 text-xs font-medium">
              Platform
            </TableHead>
            <TableHead className="w-[10%] px-2 py-1.5 text-xs font-medium">
              Type
            </TableHead>
            <TableHead className="w-[8%] px-2 py-1.5 text-xs font-medium">
              Status
            </TableHead>
            <TableHead className="w-[6%] px-2 py-1.5 text-xs font-medium">
              Duration
            </TableHead>
            <TableHead className="w-[12%] px-2 py-1.5 text-xs font-medium">
              Editor
            </TableHead>
            <TableHead className="w-[12%] px-2 py-1.5 text-xs font-medium">
              Deadline
            </TableHead>
            <TableHead className="w-[12%] px-2 py-1.5 text-xs font-medium">
              Release Date
            </TableHead>
            <TableHead className="w-[16%] text-right px-2 py-1.5 text-xs font-medium">
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
              const carInfo = getCarInfo?.(deliverable);

              return (
                <TableRow key={deliverable._id?.toString()}>
                  {isBatchMode && (
                    <TableCell className="px-2 py-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleDeliverableSelection(
                            deliverable._id?.toString() || ""
                          )
                        }
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
                    {renderCell(deliverable, "platform")}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-xs">
                    {renderCell(deliverable, "type")}
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
                  <TableCell className="px-2 py-1.5">
                    <div className="flex justify-end items-center gap-1">
                      {!isBatchMode && (
                        <>
                          {/* Dropbox Link Icon */}
                          {deliverable.dropbox_link ? (
                            <a
                              href={deliverable.dropbox_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-blue-600 hover:text-blue-800"
                              title="Open Dropbox"
                            >
                              <Cloud className="h-4 w-4" />
                            </a>
                          ) : (
                            <div
                              className="p-1 text-gray-400"
                              title="No Dropbox link"
                            >
                              <Cloud className="h-4 w-4" />
                            </div>
                          )}

                          {/* Social Media Link Icon */}
                          {deliverable.social_media_link && (
                            <a
                              href={deliverable.social_media_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-blue-600 hover:text-blue-800"
                              title="Open Social Media"
                            >
                              <Share2 className="h-4 w-4" />
                            </a>
                          )}

                          {/* YouTube Upload Button */}
                          <YouTubeUploadHelper deliverable={deliverable} />

                          <EditDeliverableForm
                            deliverable={deliverable}
                            onDeliverableUpdated={() => {}}
                            onClose={() => {}}
                          />
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
