"use client";

import React, { useEffect, useRef, useState } from "react";
import { Editor } from "@monaco-editor/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Code,
  Save,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Terminal,
} from "lucide-react";

interface CSSEditorProps {
  cssContent: string;
  onCSSChange: (css: string) => void;
  selectedStylesheetId?: string | null;
  onSave?: () => void;
  isSaving?: boolean;
  className?: string;
}

/**
 * CSSEditor Component - Monaco Editor with VIM keybindings for CSS editing
 *
 * Features:
 * - Monaco Editor with CSS syntax highlighting
 * - VIM keybindings integration using monaco-vim
 * - Dark theme consistent with existing UI
 * - Auto-completion and error detection
 * - Real-time CSS content updates
 * - Save functionality with visual feedback
 */
export function CSSEditor({
  cssContent,
  onCSSChange,
  selectedStylesheetId,
  onSave,
  isSaving = false,
  className = "",
}: CSSEditorProps) {
  const { toast } = useToast();
  const editorRef = useRef<any>(null);
  const vimModeRef = useRef<any>(null);
  const [isVimEnabled, setIsVimEnabled] = useState(true);
  const [editorMounted, setEditorMounted] = useState(false);
  const [localContent, setLocalContent] = useState(cssContent);
  const [isDisposed, setIsDisposed] = useState(false);

  // Initialize VIM mode when editor mounts
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    setEditorMounted(true);
    setIsDisposed(false);

    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      lineHeight: 22,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: "on",
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
    });

    // Add Ctrl+S keybinding for saving CSS
    if (onSave) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        console.log("⚡ Ctrl+S triggered - saving CSS");
        handleSave();

        // Show brief save notification
        const saveNotification = document.createElement("div");
        saveNotification.textContent = "CSS Saved!";
        saveNotification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          z-index: 10000;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: opacity 0.3s ease;
        `;

        document.body.appendChild(saveNotification);

        // Remove notification after 2 seconds
        setTimeout(() => {
          saveNotification.style.opacity = "0";
          setTimeout(() => {
            if (document.body.contains(saveNotification)) {
              document.body.removeChild(saveNotification);
            }
          }, 300);
        }, 2000);
      });
    }

    // Initialize VIM mode if enabled, with a small delay to ensure editor is fully ready
    if (isVimEnabled) {
      setTimeout(() => {
        if (!isDisposed && editorRef.current) {
          initializeVimMode(editor, monaco);
        }
      }, 100);
    }

    // Focus the editor
    editor.focus();
  };

  const initializeVimMode = async (editor: any, monaco: any) => {
    // Check if editor is still valid and not disposed
    if (!editor || isDisposed) {
      console.log("⚠️ Skipping VIM initialization - editor not available");
      return;
    }

    try {
      // Clean up any existing VIM mode first
      if (vimModeRef.current) {
        try {
          vimModeRef.current.dispose();
        } catch (e) {
          console.warn("Warning disposing previous VIM mode:", e);
        }
        vimModeRef.current = null;
      }

      // Dynamically import monaco-vim to avoid SSR issues
      // @ts-ignore - monaco-vim doesn't have TypeScript declarations
      const monacoVim = await import("monaco-vim");

      // Double-check editor is still valid before initializing VIM
      if (!editor || isDisposed || !editorRef.current) {
        console.log("⚠️ Editor disposed during VIM initialization");
        return;
      }

      const statusElement = document.getElementById("vim-status");
      vimModeRef.current = monacoVim.initVimMode(editor, statusElement);

      // Add custom :w command to save CSS
      if (vimModeRef.current && onSave) {
        // Define custom :w command
        monacoVim.VimMode.Vim.defineEx("write", "w", () => {
          console.log("⚡ VIM :w command triggered - saving CSS");
          handleSave();
          // Show status message in VIM status bar
          const statusEl = document.getElementById("vim-status");
          if (statusEl) {
            const originalText = statusEl.textContent;
            statusEl.textContent = "CSS saved!";
            statusEl.style.color = "#10b981"; // green color
            setTimeout(() => {
              statusEl.textContent = originalText;
              statusEl.style.color = "";
            }, 2000);
          }
        });

        // Also define :write for completeness
        monacoVim.VimMode.Vim.defineEx("write", "write", () => {
          console.log("⚡ VIM :write command triggered - saving CSS");
          handleSave();
          const statusEl = document.getElementById("vim-status");
          if (statusEl) {
            const originalText = statusEl.textContent;
            statusEl.textContent = "CSS saved!";
            statusEl.style.color = "#10b981";
            setTimeout(() => {
              statusEl.textContent = originalText;
              statusEl.style.color = "";
            }, 2000);
          }
        });
      }

      console.log("✅ VIM mode initialized successfully with :w save command");

      toast({
        title: "VIM Mode Enabled",
        description:
          "Use VIM keybindings for CSS editing. Type ':w' to save, 'i' to insert.",
      });
    } catch (error) {
      console.error("❌ Failed to initialize VIM mode:", error);

      // Only show error toast if it's not a disposal error
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes("disposed")) {
        toast({
          title: "VIM Mode Error",
          description:
            "Failed to enable VIM keybindings. Editor will work in normal mode.",
          variant: "destructive",
        });
      }
    }
  };

  const toggleVimMode = async () => {
    if (!editorRef.current || isDisposed) return;

    if (isVimEnabled) {
      // Disable VIM mode
      if (vimModeRef.current) {
        try {
          vimModeRef.current.dispose();
        } catch (e) {
          console.warn("Warning disposing VIM mode:", e);
        }
        vimModeRef.current = null;
      }
      setIsVimEnabled(false);
      toast({
        title: "VIM Mode Disabled",
        description: "Using standard editor keybindings.",
      });
    } else {
      // Enable VIM mode
      setIsVimEnabled(true);
      if (editorRef.current && !isDisposed) {
        const monaco = await import("monaco-editor");
        await initializeVimMode(editorRef.current, monaco);
      }
    }
  };

  // Handle content changes
  const handleContentChange = (value: string | undefined) => {
    const newContent = value || "";
    setLocalContent(newContent);
    onCSSChange(newContent);
  };

  // Sync external content changes
  useEffect(() => {
    if (cssContent !== localContent) {
      setLocalContent(cssContent);
    }
  }, [cssContent]);

  // Cleanup VIM mode on unmount
  useEffect(() => {
    return () => {
      setIsDisposed(true);
      if (vimModeRef.current) {
        try {
          vimModeRef.current.dispose();
        } catch (e) {
          console.warn("Warning disposing VIM mode on unmount:", e);
        }
        vimModeRef.current = null;
      }
    };
  }, []);

  // Cleanup when component is about to be removed (mode switching)
  useEffect(() => {
    return () => {
      setIsDisposed(true);
    };
  }, []);

  const handleSave = () => {
    if (onSave) {
      onSave();
    }
  };

  const refreshEditor = () => {
    if (editorRef.current) {
      editorRef.current.getAction("editor.action.formatDocument").run();
      toast({
        title: "CSS Formatted",
        description: "Code has been formatted and indented.",
      });
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* CSS Editor Header */}
      <Card className="mb-4 bg-transparent border border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Code className="h-5 w-5" />
              CSS Editor
              {selectedStylesheetId && (
                <Badge variant="outline" className="bg-transparent text-xs">
                  Stylesheet: {selectedStylesheetId.slice(0, 8)}...
                </Badge>
              )}
            </CardTitle>

            <div className="flex items-center gap-2">
              <Button
                onClick={toggleVimMode}
                variant="outline"
                size="sm"
                className="bg-background border-border/40 hover:bg-muted/20"
                title={isVimEnabled ? "Disable VIM mode" : "Enable VIM mode"}
              >
                <Terminal className="h-4 w-4 mr-2" />
                VIM: {isVimEnabled ? "ON" : "OFF"}
              </Button>

              <Button
                onClick={refreshEditor}
                variant="outline"
                size="sm"
                className="bg-background border-border/40 hover:bg-muted/20"
                title="Format CSS"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>

              {onSave && (
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  variant="default"
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save CSS
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-transparent text-xs">
                Lines: {localContent.split("\n").length}
              </Badge>
              <Badge variant="outline" className="bg-transparent text-xs">
                Characters: {localContent.length}
              </Badge>
            </div>

            {isVimEnabled && (
              <div className="flex items-center gap-2">
                <span className="text-xs">VIM Status:</span>
                <div
                  id="vim-status"
                  className="text-xs font-mono bg-muted/20 px-2 py-1 rounded border"
                >
                  -- NORMAL --
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Monaco Editor Container */}
      <div className="flex-1 border border-border/40 rounded-lg overflow-hidden bg-background">
        <Editor
          height="100%"
          language="css"
          theme="vs-dark"
          value={localContent}
          onChange={handleContentChange}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            lineHeight: 22,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true,
            suggest: {
              showKeywords: true,
              showSnippets: true,
              showColors: true,
              showProperties: true,
              showValues: true,
            },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: true,
            },
          }}
          loading={
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Loading CSS Editor...
                </p>
              </div>
            </div>
          }
        />
      </div>

      {/* Editor Footer */}
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Monaco Editor with CSS IntelliSense</span>
          {isVimEnabled && (
            <span className="flex items-center gap-1">
              <Terminal className="h-3 w-3" />
              VIM keybindings enabled
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span>Ctrl+S to save</span>
          {isVimEnabled && (
            <>
              <span>•</span>
              <span>:w to save</span>
            </>
          )}
          <span>•</span>
          <span>Ctrl+Shift+P for commands</span>
        </div>
      </div>
    </div>
  );
}
