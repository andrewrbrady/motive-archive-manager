import React from "react";
import { Car } from "@/types/car";
import { useRouter } from "next/navigation";

interface ListViewProps {
  cars: Car[];
  currentSearchParams: string;
}

export default function ListView({ cars, currentSearchParams }: ListViewProps) {
  const router = useRouter();

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm table-fixed">
        <thead>
          <tr className="bg-gray-50 dark:bg-black/25 border-y border-gray-200 dark:border-gray-800">
            <th className="w-[8%] py-2 px-3 text-left font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800">
              Year
            </th>
            <th className="w-[12%] py-2 px-3 text-left font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800">
              Make
            </th>
            <th className="w-[15%] py-2 px-3 text-left font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800">
              Model
            </th>
            <th className="w-[12%] py-2 px-3 text-right font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800">
              Price
            </th>
            <th className="w-[12%] py-2 px-3 text-right font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800">
              Mileage
            </th>
            <th className="w-[8%] py-2 px-3 text-right font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800">
              HP
            </th>
            <th className="w-[12%] py-2 px-3 text-left font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800">
              Color
            </th>
            <th className="w-[10%] py-2 px-3 text-left font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800">
              Condition
            </th>
            <th className="w-[11%] py-2 px-3 text-left font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800">
              Location
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-[#111111] divide-y divide-gray-200 dark:divide-gray-800">
          {cars.map((car) => (
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
                {car.type && (
                  <span className="text-xs uppercase text-gray-500 dark:text-gray-400 ml-1">
                    {car.type}
                  </span>
                )}
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
