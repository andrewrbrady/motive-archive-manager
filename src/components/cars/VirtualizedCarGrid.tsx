"use client";

import React, { useMemo } from "react";
import { FixedSizeGrid as Grid } from "react-window";
import { Car } from "@/types/car";
import CarCard from "./CarCard";
import { cn } from "@/lib/utils";

interface VirtualizedCarGridProps {
  cars: Car[];
  currentSearchParams?: string;
  className?: string;
  gridClassName?: string;
  onCarClick?: (car: Car) => void;
  selectionMode?: "none" | "single" | "multiple";
  selectedCarIds?: string[];
  isCarSelected?: (carId: string) => boolean;
}

interface GridItemProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    cars: Car[];
    columnsPerRow: number;
    currentSearchParams?: string;
    onCarClick?: (car: Car) => void;
    selectionMode?: "none" | "single" | "multiple";
    selectedCarIds?: string[];
    isCarSelected?: (carId: string) => boolean;
  };
}

const GridItem = React.memo(
  ({ columnIndex, rowIndex, style, data }: GridItemProps) => {
    const {
      cars,
      columnsPerRow,
      currentSearchParams,
      onCarClick,
      selectionMode,
      selectedCarIds,
      isCarSelected,
    } = data;
    const carIndex = rowIndex * columnsPerRow + columnIndex;
    const car = cars[carIndex];

    if (!car) {
      return <div style={style} />;
    }

    const handleClick = () => {
      if (selectionMode !== "none" && onCarClick) {
        onCarClick(car);
      }
    };

    return (
      <div style={style} className="p-3">
        <div
          className={cn(
            "relative",
            selectionMode !== "none" && "cursor-pointer",
            isCarSelected?.(car._id) &&
              "ring-2 ring-blue-500 ring-offset-2 rounded-lg"
          )}
          onClick={handleClick}
        >
          {/* Selection Indicator */}
          {selectionMode !== "none" && (
            <div className="absolute top-2 left-2 z-10">
              <div
                className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                  isCarSelected?.(car._id)
                    ? "bg-blue-500 border-blue-500 text-white"
                    : "bg-white border-gray-300"
                )}
              >
                {isCarSelected?.(car._id) && (
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </div>
          )}

          <CarCard car={car} currentSearchParams={currentSearchParams} />
        </div>
      </div>
    );
  }
);

GridItem.displayName = "GridItem";

export function VirtualizedCarGrid({
  cars,
  currentSearchParams,
  className,
  gridClassName,
  onCarClick,
  selectionMode = "none",
  selectedCarIds = [],
  isCarSelected,
}: VirtualizedCarGridProps) {
  const { columnsPerRow, rowCount, itemWidth, itemHeight } = useMemo(() => {
    // Calculate responsive columns based on screen size
    // This is a simplified version - in a real implementation, you'd want to use a resize observer
    const screenWidth =
      typeof window !== "undefined" ? window.innerWidth : 1200;
    let columns = 4; // xl:grid-cols-4

    if (screenWidth < 768) {
      columns = 1; // grid-cols-1
    } else if (screenWidth < 1024) {
      columns = 2; // md:grid-cols-2
    } else if (screenWidth < 1280) {
      columns = 3; // lg:grid-cols-3
    }

    const rows = Math.ceil(cars.length / columns);
    const width = Math.floor((screenWidth - 48) / columns); // Account for padding
    const height = Math.floor(width * 0.75) + 120; // Aspect ratio + content height

    return {
      columnsPerRow: columns,
      rowCount: rows,
      itemWidth: width,
      itemHeight: height,
    };
  }, [cars.length]);

  const gridData = useMemo(
    () => ({
      cars,
      columnsPerRow,
      currentSearchParams,
      onCarClick,
      selectionMode,
      selectedCarIds,
      isCarSelected,
    }),
    [
      cars,
      columnsPerRow,
      currentSearchParams,
      onCarClick,
      selectionMode,
      selectedCarIds,
      isCarSelected,
    ]
  );

  if (cars.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No cars available.</p>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <Grid
        className={cn("w-full", gridClassName)}
        columnCount={columnsPerRow}
        columnWidth={itemWidth}
        width={columnsPerRow * itemWidth}
        height={Math.min(600, rowCount * itemHeight)} // Max height of 600px
        rowCount={rowCount}
        rowHeight={itemHeight}
        itemData={gridData}
        overscanRowCount={2}
        overscanColumnCount={1}
      >
        {GridItem}
      </Grid>
    </div>
  );
}
