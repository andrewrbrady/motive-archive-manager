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
    <div className={`flex gap-2 ${className}`}>
      <input
        type="number"
        value={value.value === null ? "" : value.value}
        onChange={handleValueChange}
        placeholder={placeholder}
        className="flex-1 bg-white border rounded px-2 py-1"
      />
      <select
        value={value.unit}
        onChange={handleUnitChange}
        className="bg-white border rounded px-2 py-1 text-sm"
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
