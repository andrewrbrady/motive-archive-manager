import React from "react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "./loading-spinner";

// Define the LoadingSpinnerProps interface here since it's not exported from loading-spinner
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export interface LoadingContainerProps extends LoadingSpinnerProps {
  /**
   * Whether to fill the parent container's height. Default is false.
   */
  fullHeight?: boolean;

  /**
   * Custom padding for the container. Default is "py-8".
   */
  padding?: string;
}

export function LoadingContainer({
  fullHeight = false,
  padding = "py-8",
  ...spinnerProps
}: LoadingContainerProps) {
  return (
    <div
      className={cn("w-full flex items-center justify-center", padding, {
        "h-full": fullHeight,
        "min-h-[200px]": !fullHeight,
      })}
    >
      <LoadingSpinner {...spinnerProps} />
    </div>
  );
}
