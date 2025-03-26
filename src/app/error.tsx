"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background py-2">
      <h1 className="text-4xl font-bold mb-4 text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]">
        500 - Something went wrong!
      </h1>
      <p className="text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] mb-4">
        An error occurred while processing your request.
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-md hover:bg-[hsl(var(--primary))/90]"
      >
        Try again
      </button>
    </div>
  );
}
