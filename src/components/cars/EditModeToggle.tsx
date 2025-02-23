"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Edit } from "lucide-react";

interface EditModeToggleProps {
  isEditMode: boolean;
}

export default function EditModeToggle({ isEditMode }: EditModeToggleProps) {
  const router = useRouter();

  const toggleEditMode = () => {
    const searchParams = new URLSearchParams(window.location.search);
    if (isEditMode) {
      searchParams.delete("edit");
    } else {
      searchParams.set("edit", "true");
    }
    router.push(`?${searchParams.toString()}`);
  };

  return (
    <Button
      variant="outline"
      onClick={toggleEditMode}
      title={isEditMode ? "Exit Edit Mode" : "Enter Edit Mode"}
      className="p-2 text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] dark:hover:text-[hsl(var(--foreground-subtle))] transition-colors rounded-full hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))]"
    >
      <Edit className="h-4 w-4" />
    </Button>
  );
}
