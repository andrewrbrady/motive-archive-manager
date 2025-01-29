import React from "react";

interface MeasurementValue {
  value: number | null;
  unit: string;
}

interface MeasurementInputWithUnitProps {
  value: MeasurementValue;
  onChange: (value: MeasurementValue) => void;
  availableUnits: string[];
  placeholder?: string;
  className?: string;
}

export default function MeasurementInputWithUnit({
  value,
  onChange,
  availableUnits,
  placeholder,
  className = "",
}: MeasurementInputWithUnitProps) {
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value === "" ? null : Number(e.target.value);
    onChange({ ...value, value: newValue });
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...value, unit: e.target.value });
  };

  return (
    <div className={`flex gap-1 ${className}`}>
      <input
        type="number"
        value={value.value === null ? "" : value.value}
        onChange={handleValueChange}
        placeholder={placeholder}
        className="w-16 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded px-2 py-1 text-left text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
      />
      <select
        value={value.unit}
        onChange={handleUnitChange}
        className="w-14 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded px-1 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
      >
        {availableUnits.map((unit) => (
          <option key={unit} value={unit}>
            {unit}
          </option>
        ))}
      </select>
    </div>
  );
}
