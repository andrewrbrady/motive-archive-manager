"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface PageSizeSelectorProps {
  currentPageSize: number;
  options: number[];
}

const PageSizeSelector = ({
  currentPageSize,
  options,
}: PageSizeSelectorProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePageSizeChange = (newSize: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("pageSize", newSize);
    params.set("page", "1"); // Reset to first page when changing page size
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="pageSize"
        className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium"
      >
        Items per page
      </label>
      <select
        id="pageSize"
        value={currentPageSize}
        onChange={(e) => handlePageSizeChange(e.target.value)}
        className="text-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111111] text-gray-900 dark:text-gray-100 rounded-md px-2 py-1.5 focus:outline-none focus:ring-0 focus:border-gray-400 dark:focus:border-gray-700"
      >
        {options.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </div>
  );
};

export default PageSizeSelector;
