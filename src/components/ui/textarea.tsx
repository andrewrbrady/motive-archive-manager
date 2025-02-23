import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  // Add any custom props here if needed
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border bg-[hsl(var(--background))] border-[hsl(var(--border-subtle))] px-3 py-2 text-sm ring-offset-background placeholder:text-[hsl(var(--foreground-muted))] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-600 focus-visible:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
