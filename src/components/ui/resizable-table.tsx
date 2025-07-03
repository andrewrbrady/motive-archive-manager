import React, { useState, useRef, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ResizableColumnConfig {
  key: string;
  header: string | React.ReactNode;
  minWidth?: number;
  maxWidth?: number;
  defaultWidth: number;
  resizable?: boolean;
}

interface ResizableTableProps {
  columns: ResizableColumnConfig[];
  children: React.ReactNode;
  className?: string;
  onColumnResize?: (columnKey: string, width: number) => void;
}

export function ResizableTable({
  columns,
  children,
  className = "",
  onColumnResize,
}: ResizableTableProps) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    () => {
      const initial: Record<string, number> = {};
      columns.forEach((col) => {
        initial[col.key] = col.defaultWidth;
      });
      return initial;
    }
  );

  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const tableRef = useRef<HTMLTableElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, columnKey: string) => {
      if (!columnWidths[columnKey]) return;

      setIsResizing(columnKey);
      setStartX(e.clientX);
      setStartWidth(columnWidths[columnKey]);
      e.preventDefault();
    },
    [columnWidths]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const column = columns.find((col) => col.key === isResizing);
      if (!column) return;

      const deltaX = e.clientX - startX;
      const newWidth = Math.max(
        column.minWidth || 80,
        Math.min(column.maxWidth || 500, startWidth + deltaX)
      );

      setColumnWidths((prev) => ({
        ...prev,
        [isResizing]: newWidth,
      }));

      onColumnResize?.(isResizing, newWidth);
    },
    [isResizing, startX, startWidth, columns, onColumnResize]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(null);
  }, []);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      if (isResizing) {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div className="w-full overflow-x-auto">
      <Table ref={tableRef} className={`w-full ${className}`}>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead
                key={column.key}
                style={{ width: `${columnWidths[column.key]}px` }}
                className="relative px-2 py-1.5 text-xs font-medium border-r border-border/30 last:border-r-0"
              >
                <div className="flex items-center justify-between">
                  <div className="truncate">{column.header}</div>
                </div>

                {/* Resize Handle */}
                {column.resizable !== false && index < columns.length - 1 && (
                  <div
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors"
                    onMouseDown={(e) => handleMouseDown(e, column.key)}
                    style={{
                      background:
                        isResizing === column.key
                          ? "rgba(var(--primary), 0.3)"
                          : "transparent",
                    }}
                  />
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        {children}
      </Table>

      {/* Resize Indicator */}
      {isResizing && (
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-50">
          <div className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded shadow-lg fixed top-4 left-1/2 transform -translate-x-1/2">
            Resizing: {columnWidths[isResizing]}px
          </div>
        </div>
      )}
    </div>
  );
}

export function ResizableTableBody({
  children,
  ...props
}: React.ComponentProps<typeof TableBody>) {
  return <TableBody {...props}>{children}</TableBody>;
}

export function ResizableTableRow({
  children,
  ...props
}: React.ComponentProps<typeof TableRow>) {
  return <TableRow {...props}>{children}</TableRow>;
}

export function ResizableTableCell({
  children,
  columnKey,
  ...props
}: React.ComponentProps<typeof TableCell> & { columnKey?: string }) {
  return (
    <TableCell
      {...props}
      className={`px-2 py-1.5 text-xs border-r border-border/10 last:border-r-0 ${props.className || ""}`}
    >
      {children}
    </TableCell>
  );
}
