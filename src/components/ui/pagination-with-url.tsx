"use client";

import { useEffect, useState } from "react";
import { useUrlParams } from "@/hooks/useUrlParams";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationWithUrlProps {
  /** Total number of pages */
  totalPages: number;
  /** Default page to show if not specified in URL */
  defaultPage?: number;
  /** Default page size if not specified in URL */
  defaultPageSize?: number;
  /** Called when page changes */
  onPageChange?: (page: number) => void;
  /** Current context (e.g., 'tab:hard-drives') */
  context?: string;
  /** Parameters to preserve when updating pagination */
  preserveParams?: string[];
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Whether to show the page size selector */
  showPageSizeSelector?: boolean;
}

/**
 * A pagination component that syncs with URL parameters
 *
 * This component makes pagination state bookmarkable and shareable via URLs,
 * while ensuring proper cleanup of parameters when navigating.
 */
export function PaginationWithUrl({
  totalPages,
  defaultPage = 1,
  defaultPageSize = 10,
  onPageChange,
  context,
  preserveParams = [],
  pageSizeOptions = [10, 25, 50, 100],
  showPageSizeSelector = true,
}: PaginationWithUrlProps) {
  const { getParam, updateParams } = useUrlParams();

  // Initialize from URL or defaults
  const [currentPage, setCurrentPage] = useState(() => {
    const page = getParam("page");
    return page ? parseInt(page, 10) : defaultPage;
  });

  const [pageSize, setPageSize] = useState(() => {
    const limit = getParam("limit");
    return limit ? parseInt(limit, 10) : defaultPageSize;
  });

  const [pageInput, setPageInput] = useState(currentPage.toString());

  // Validate current page when total pages changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      handlePageChange(1);
    }
  }, [totalPages]);

  // Handle page changes
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;

    setCurrentPage(page);
    setPageInput(page.toString());

    updateParams(
      { page: page.toString() },
      { preserveParams: ["tab", "limit", ...preserveParams] }
    );

    if (onPageChange) {
      onPageChange(page);
    }
  };

  // Handle page size changes
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    setPageInput("1");

    updateParams(
      {
        limit: size.toString(),
        page: "1",
      },
      { preserveParams: ["tab", ...preserveParams] }
    );

    if (onPageChange) {
      onPageChange(1);
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPage = parseInt(pageInput, 10);
    if (newPage >= 1 && newPage <= totalPages) {
      handlePageChange(newPage);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] dark:hover:text-[hsl(var(--foreground-subtle))] disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-full hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))]"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <form
          onSubmit={handlePageInputSubmit}
          className="flex items-center gap-2"
        >
          <input
            type="number"
            min="1"
            max={totalPages}
            value={pageInput}
            onChange={handlePageInputChange}
            className="w-12 py-1.5 text-sm border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] bg-transparent text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] text-center focus:outline-none focus:border-[hsl(var(--border-primary))] dark:focus:border-[hsl(var(--border-subtle))] rounded-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
            / {totalPages}
          </span>
        </form>

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] dark:hover:text-[hsl(var(--foreground-subtle))] disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-full hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))]"
          aria-label="Next page"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {showPageSizeSelector && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
            Items per page:
          </span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="py-1 px-2 text-sm border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] bg-transparent text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] rounded-md focus:outline-none focus:border-[hsl(var(--border-primary))] dark:focus:border-[hsl(var(--border-subtle))]"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
