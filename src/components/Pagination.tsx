"use client";
import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  totalPages: number;
  currentPage: number;
  pageSize: number;
  onChange?: (page: number) => void;
  useUrlPagination?: boolean;
}

const Pagination = ({
  totalPages,
  currentPage,
  pageSize,
  onChange,
  useUrlPagination = true,
}: PaginationProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pageInput, setPageInput] = useState(currentPage.toString());

  const handlePageChange = (page: number) => {
    if (onChange) {
      onChange(page);
    } else if (useUrlPagination) {
      const params = new URLSearchParams(searchParams);
      params.set("page", page.toString());
      params.set("pageSize", pageSize.toString());

      // Determine the correct path to use
      let targetPath = pathname;

      // If we're on the market page with a tab, ensure we preserve the tab parameter
      if (pathname.includes("/market") && params.has("tab")) {
        // Tab parameter is already in the params, so we keep it
      } else if (pathname === "/inventory" || pathname === "/auctions") {
        // We're on a direct page, so we keep the current path
      } else if (pathname === "/market") {
        // We're on the market page without a tab, default to inventory
        params.set("tab", "inventory");
      }

      router.push(`${targetPath}?${params.toString()}`);
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

  return (
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
  );
};

export default Pagination;
