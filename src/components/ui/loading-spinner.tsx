import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LoadingSpinnerProps {
  /**
   * Size of the spinner in pixels. Default is 24px.
   */
  size?: number;

  /**
   * Custom CSS classes to apply to the spinner.
   */
  className?: string;

  /**
   * Text to display next to the spinner. If not provided, only the spinner will be shown.
   */
  text?: string;

  /**
   * Position of the text relative to the spinner. Default is "right".
   */
  textPosition?: "left" | "right" | "top" | "bottom";

  /**
   * Gap between spinner and text (if text is provided). Default is 2.
   */
  gap?: number;
}

export function LoadingSpinner({
  size = 24,
  className,
  text,
  textPosition = "right",
  gap = 2,
}: LoadingSpinnerProps) {
  const wrapperClassName = cn(
    "flex items-center justify-center",
    {
      "flex-row": textPosition === "right",
      "flex-row-reverse": textPosition === "left",
      "flex-col": textPosition === "bottom",
      "flex-col-reverse": textPosition === "top",
    },
    className
  );

  const gapClassName = cn({
    [`gap-${gap}`]: gap > 0,
  });

  return (
    <div className={cn(wrapperClassName, gapClassName)}>
      <Loader2
        className="animate-spin"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
      {text && <span className="text-muted-foreground">{text}</span>}
    </div>
  );
}
