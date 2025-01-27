import React, { useState } from "react";
import { Car } from "@/types/car";
import { useRouter } from "next/navigation";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/20/solid";

interface ListViewProps {
  cars: Car[];
  currentSearchParams: string;
}

type SortField =
  | "year"
  | "make"
  | "model"
  | "price"
  | "mileage"
  | "horsepower"
  | "color"
  | "condition"
  | "location";
type SortDirection = "asc" | "desc";

export default function ListView({ cars, currentSearchParams }: ListViewProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>("year");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedCars = [...cars].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    const aString = String(aValue).toLowerCase();
    const bString = String(bValue).toLowerCase();

    return sortDirection === "asc"
      ? aString.localeCompare(bString)
      : bString.localeCompare(aString);
  });

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUpIcon className="w-4 h-4 inline-block ml-1" />
    ) : (
      <ChevronDownIcon className="w-4 h-4 inline-block ml-1" />
    );
  };

  const HeaderCell = ({
    field,
    width,
    align = "left",
    children,
  }: {
    field: SortField;
    width: string;
    align?: "left" | "right";
    children: React.ReactNode;
  }) => (
    <th
      className={`${width} py-2 px-3 text-${align} font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-black/40 transition-colors`}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center">
        {children}
        <SortIndicator field={field} />
      </span>
    </th>
  );

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm table-fixed">
        <thead>
          <tr className="bg-gray-50 dark:bg-black/25 border-y border-gray-200 dark:border-gray-800">
            <HeaderCell field="year" width="w-[8%]">
              Year
            </HeaderCell>
            <HeaderCell field="make" width="w-[12%]">
              Make
            </HeaderCell>
            <HeaderCell field="model" width="w-[15%]">
              Model
            </HeaderCell>
            <HeaderCell field="price" width="w-[12%]" align="right">
              Price
            </HeaderCell>
            <HeaderCell field="mileage" width="w-[12%]" align="right">
              Mileage
            </HeaderCell>
            <HeaderCell field="horsepower" width="w-[8%]" align="right">
              HP
            </HeaderCell>
            <HeaderCell field="color" width="w-[12%]">
              Color
            </HeaderCell>
            <HeaderCell field="condition" width="w-[10%]">
              Condition
            </HeaderCell>
            <HeaderCell field="location" width="w-[11%]">
              Location
            </HeaderCell>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-[#111111] divide-y divide-gray-200 dark:divide-gray-800">
          {sortedCars.map((car) => (
            <tr
              key={car._id}
              className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-black/25 transition-colors cursor-pointer"
              onClick={() =>
                router.push(`/cars/${car._id}?${currentSearchParams}`)
              }
            >
              <td className="w-[8%] py-2 px-3 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                {car.year}
              </td>
              <td className="w-[12%] py-2 px-3 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                {car.make}
              </td>
              <td className="w-[15%] py-2 px-3 border border-gray-200 dark:border-gray-800">
                <span className="text-gray-900 dark:text-gray-100">
                  {car.model}
                </span>
              </td>
              <td className="w-[12%] py-2 px-3 text-right border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                {typeof car.price === "number"
                  ? `$${car.price.toLocaleString()}`
                  : car.price}
              </td>
              <td className="w-[12%] py-2 px-3 text-right border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                {typeof car.mileage === "number"
                  ? `${car.mileage.toLocaleString()}`
                  : car.mileage || "-"}
              </td>
              <td className="w-[8%] py-2 px-3 text-right border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                {typeof car.horsepower === "number"
                  ? car.horsepower.toLocaleString()
                  : car.horsepower || "-"}
              </td>
              <td className="w-[12%] py-2 px-3 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                {car.color}
              </td>
              <td className="w-[10%] py-2 px-3 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                {car.condition || "-"}
              </td>
              <td className="w-[11%] py-2 px-3 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                {car.location || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
