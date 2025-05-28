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
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("pageSize", newSize);
    params.set("page", "1"); // Reset to first page when changing page size
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center">
      <select
        id="pageSize"
        value={currentPageSize}
        onChange={(e) => handlePageSizeChange(e.target.value)}
        className="text-sm border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] bg-[var(--background-primary)] dark:bg-[var(--background-primary)] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] rounded-md px-2 py-1.5 focus:outline-none focus:ring-0 focus:border-[hsl(var(--border-primary))] dark:focus:border-[hsl(var(--border-subtle))] w-full"
        title="Items per page"
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
