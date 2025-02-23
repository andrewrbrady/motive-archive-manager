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
  // Ensure value has a valid structure
  const safeValue = {
    value: value?.value ?? null,
    unit: value?.unit || availableUnits[0] || "",
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value === "" ? null : Number(e.target.value);
    onChange({ ...safeValue, value: newValue });
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...safeValue, unit: e.target.value });
  };

  return (
    <div className={`flex gap-1 ${className}`}>
      <input
        type="number"
        value={safeValue.value === null ? "" : safeValue.value}
        onChange={handleValueChange}
        placeholder={placeholder}
        className="w-32 bg-background text-text-primary border border-border-primary rounded-md px-3 py-2 text-sm placeholder:text-text-tertiary transition-all duration-base focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
      />
      <select
        value={safeValue.unit}
        onChange={handleUnitChange}
        className="w-20 bg-background text-text-primary border border-border-primary rounded-md px-2 py-2 text-sm placeholder:text-text-tertiary transition-all duration-base focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
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
