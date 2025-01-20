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
      router.push(`${pathname}?${params.toString()}`);
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
        className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 disabled:opacity-50"
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
          className="w-16 px-2 py-1 border rounded text-center"
        />
        <span className="text-sm">of {totalPages}</span>
      </form>
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 disabled:opacity-50"
        aria-label="Next page"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Pagination;
