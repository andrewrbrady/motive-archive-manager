"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Edit, X } from "lucide-react";

interface EditModeToggleProps {
  isEditMode: boolean;
}

export default function EditModeToggle({ isEditMode }: EditModeToggleProps) {
  const router = useRouter();

  const toggleEditMode = () => {
    const searchParams = new URLSearchParams(window.location.search);
    if (isEditMode) {
      searchParams.delete("mode");
    } else {
      searchParams.set("mode", "edit");
    }
    router.push(`?${searchParams.toString()}`);
  };

  return (
    <Button
      variant={isEditMode ? "default" : "outline"}
      onClick={toggleEditMode}
      title={isEditMode ? "Exit Edit Mode" : "Enter Edit Mode"}
      className="transition-colors"
    >
      {isEditMode ? (
        <>
          <X className="h-4 w-4 mr-2" />
          Exit Edit Mode
        </>
      ) : (
        <>
          <Edit className="h-4 w-4 mr-2" />
          Edit Mode
        </>
      )}
    </Button>
  );
}
