// components/ui/button.tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-[#111111] dark:focus-visible:ring-gray-300",
  {
    variants: {
      variant: {
        default:
          "bg-white text-gray-900 hover:bg-gray-100 dark:bg-[#111111] dark:text-gray-50 dark:hover:bg-gray-900",
        destructive:
          "bg-white text-gray-700 hover:bg-gray-100 dark:bg-[#111111] dark:text-gray-400 dark:hover:bg-gray-900",
        outline:
          "border border-gray-200 bg-white hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:bg-[#111111] dark:hover:bg-gray-900 dark:hover:text-gray-50",
        secondary:
          "bg-white text-gray-700 hover:bg-gray-100 dark:bg-[#111111] dark:text-gray-400 dark:hover:bg-gray-900",
        ghost:
          "bg-white hover:bg-gray-100 hover:text-gray-900 dark:bg-[#111111] dark:hover:bg-gray-900 dark:hover:text-gray-50",
        link: "text-gray-900 underline-offset-4 hover:underline dark:text-gray-50",
      },
      size: {
        default: "h-10 px-4 py-2 rounded-md",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10 rounded-full p-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

export interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const ButtonGroup = ({ children, className }: ButtonGroupProps) => {
  return (
    <div
      className={cn(
        "inline-flex rounded-md shadow-sm [&>button]:rounded-none [&>button:first-child]:rounded-l-md [&>button:last-child]:rounded-r-md [&>button:not(:first-child)]:-ml-px",
        className
      )}
    >
      {children}
    </div>
  );
};
ButtonGroup.displayName = "ButtonGroup";
