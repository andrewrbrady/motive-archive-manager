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
      <label htmlFor="pageSize" className="text-sm text-gray-600">
        Items per page:
      </label>
      <select
        id="pageSize"
        value={currentPageSize}
        onChange={(e) => handlePageSizeChange(e.target.value)}
        className="px-2 py-1 border rounded text-gray-600"
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
