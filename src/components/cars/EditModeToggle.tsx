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
      className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
    >
      <Edit className="h-4 w-4" />
    </Button>
  );
}
