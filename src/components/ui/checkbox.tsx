import * as React from "react";

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  readOnly?: boolean;
}

export function Checkbox({
  checked,
  onCheckedChange,
  readOnly,
  ...props
}: CheckboxProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onCheckedChange) {
      onCheckedChange(e.target.checked);
    }
  };

  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={handleChange}
      readOnly={readOnly}
      {...props}
    />
  );
}
