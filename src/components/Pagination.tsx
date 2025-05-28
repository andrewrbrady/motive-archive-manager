"use client";
import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFastRouter } from "@/lib/navigation/simple-cache";

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
  const { fastPush } = useFastRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pageInput, setPageInput] = useState(currentPage.toString());

  const handlePageChange = (page: number) => {
    if (onChange) {
      onChange(page);
    } else if (useUrlPagination) {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("page", page.toString());
      params.set("pageSize", pageSize.toString());

      // Determine the correct path to use
      let targetPath = pathname;

      // If we're on the market page with a tab, ensure we preserve the tab parameter
      if (pathname?.includes("/market") && params.has("tab")) {
        // Tab parameter is already in the params, so we keep it
      } else if (pathname === "/inventory" || pathname === "/auctions") {
        // We're on a direct page, so we keep the current path
      } else if (pathname === "/market") {
        // We're on the market page without a tab, default to inventory
        params.set("tab", "inventory");
      }

      // Use ultra-fast router for instant pagination
      fastPush(`${targetPath}?${params.toString()}`);
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
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-1 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded hover:bg-[hsl(var(--background-secondary))]"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      <form onSubmit={handlePageInputSubmit} className="flex items-center mx-1">
        <input
          type="number"
          min="1"
          max={totalPages}
          value={pageInput}
          onChange={handlePageInputChange}
          className="w-6 h-6 text-xs text-center bg-transparent text-[hsl(var(--foreground))] focus:outline-none border border-transparent focus:border-[hsl(var(--border))] rounded transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-xs text-[hsl(var(--foreground-muted))]">
          /{totalPages}
        </span>
      </form>

      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-1 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded hover:bg-[hsl(var(--background-secondary))]"
        aria-label="Next page"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default Pagination;
