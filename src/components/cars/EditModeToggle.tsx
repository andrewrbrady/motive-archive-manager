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
      variant={isEditMode ? "default" : "outline"}
      onClick={toggleEditMode}
      title={isEditMode ? "Exit Edit Mode" : "Enter Edit Mode"}
    >
      <Edit className="h-4 w-4" />
    </Button>
  );
}
