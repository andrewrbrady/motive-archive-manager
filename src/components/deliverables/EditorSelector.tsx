"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, User } from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import { useEditors } from "@/hooks/useEditors";

interface EditorSelectorProps {
  deliverableId: string;
  initialEditor?: string;
  size?: "sm" | "md" | "lg";
  onEditorChange?: (newEditor: string) => void;
}

export function EditorSelector({
  deliverableId,
  initialEditor,
  size = "sm",
  onEditorChange,
}: EditorSelectorProps) {
  // Find the initial editor's UID based on their name
  const getInitialEditorUid = () => {
    if (!initialEditor) return "__unassigned__";
    // We'll need to wait for editors to load before we can match name to UID
    return initialEditor; // Temporarily store the name until we can resolve it
  };

  const [editor, setEditor] = useState<string>(getInitialEditorUid());
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = useAPI();
  const { data: editors = [], isLoading: editorsLoading } = useEditors();

  // Update editor state when editors load and we need to resolve name to UID
  useEffect(() => {
    if (editors.length > 0 && initialEditor && editor === initialEditor) {
      // Find the editor by name and set the UID
      const matchedEditor = editors.find((e) => e.name === initialEditor);
      if (matchedEditor) {
        setEditor(matchedEditor.uid);
      } else {
        // If no match found, set as unassigned
        setEditor("__unassigned__");
      }
    }
  }, [editors, initialEditor, editor]);

  const updateEditor = async (newEditorUid: string) => {
    if (newEditorUid === editor || !api) return;

    setIsUpdating(true);
    setError(null);

    try {
      // Convert UID to name for API (or empty string for unassigned)
      let editorName = "";
      if (newEditorUid !== "__unassigned__") {
        const selectedEditor = editors.find((e) => e.uid === newEditorUid);
        editorName = selectedEditor ? selectedEditor.name : "";
      }

      console.log(
        `🎯 Updating editor for deliverable ${deliverableId} to ${editorName} (UID: ${newEditorUid})`
      );

      const updates = {
        editor: editorName,
      };

      console.log("🔄 Sending updates:", updates);

      await api.put(`/api/deliverables/${deliverableId}`, updates);

      console.log("✅ Editor update successful");

      // Update local state with UID
      setEditor(newEditorUid);

      // Call callback if provided (send the name)
      if (onEditorChange) {
        onEditorChange(editorName);
      }
    } catch (err) {
      console.error("❌ Failed to update editor:", err);
      setError(err instanceof Error ? err.message : "Failed to update editor");
    } finally {
      setIsUpdating(false);
    }
  };

  // Get display value for current selection
  const getDisplayValue = () => {
    if (editor === "__unassigned__") {
      return "No editor assigned";
    }
    if (editor) {
      const selectedEditor = editors.find(
        (e) => e.uid === editor || e.name === editor
      );
      return selectedEditor ? selectedEditor.name : editor;
    }
    return "Select editor";
  };

  const sizingClasses = {
    sm: "h-7 px-2 text-xs",
    md: "h-8 px-2 text-sm",
    lg: "h-9 px-3 text-sm",
  };

  return (
    <div className="relative">
      <Select
        value={editor}
        onValueChange={updateEditor}
        disabled={isUpdating || editorsLoading}
      >
        <SelectTrigger
          className={`border-0 bg-transparent hover:bg-muted/50 focus:ring-1 focus:ring-ring ${sizingClasses[size]}`}
        >
          <SelectValue>
            <span className="flex items-center whitespace-nowrap">
              {(isUpdating || editorsLoading) && (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              )}
              <span className="truncate">{getDisplayValue()}</span>
            </span>
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {/* Option to clear editor */}
          <SelectItem value="__unassigned__" className="text-xs">
            <span className="flex items-center text-muted-foreground">
              <User className="mr-2 h-3 w-3" />
              No editor assigned
            </span>
          </SelectItem>

          {editors.map((editorOption) => (
            <SelectItem
              key={editorOption.uid}
              value={editorOption.uid}
              className="text-xs"
            >
              <span className="flex items-center">
                <User className="mr-2 h-3 w-3" />
                <div className="flex flex-col">
                  <span>{editorOption.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {editorOption.email}
                  </span>
                </div>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error && <div className="text-destructive text-xs mt-1">{error}</div>}
    </div>
  );
}
