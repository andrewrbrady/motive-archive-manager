"use client";

import { useRef } from "react";
import type * as monaco from "monaco-editor";
import { Editor as MonacoEditor } from "@monaco-editor/react";
import { KeyMod, KeyCode } from "monaco-editor";
import prettier from "prettier/standalone";

interface MonacoEditorWrapperProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export default function MonacoEditorWrapper({
  value,
  onChange,
  readOnly = false,
}: MonacoEditorWrapperProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const formatDocument = async () => {
    if (!editorRef.current) return;

    try {
      const unformatted = editorRef.current.getValue();
      const formatted = await prettier.format(unformatted, {
        parser: "markdown",
        printWidth: 80,
        tabWidth: 2,
        useTabs: false,
        semi: true,
        singleQuote: true,
        trailingComma: "es5",
        bracketSpacing: true,
        proseWrap: "always",
      });

      // Get the current cursor position
      const position = editorRef.current.getPosition();

      // Update the editor value
      editorRef.current.setValue(formatted);

      // Restore cursor position
      if (position) {
        editorRef.current.setPosition(position);
        editorRef.current.revealPositionInCenter(position);
      }
    } catch (error) {
      console.error("Error formatting document:", error);
    }
  };

  const handleEditorDidMount = (
    editor: monaco.editor.IStandaloneCodeEditor
  ) => {
    editorRef.current = editor;

    // Set editor theme and options
    editor.updateOptions({
      theme: "vs-dark",
      scrollbar: {
        vertical: "visible",
        horizontal: "visible",
        useShadows: false,
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
      },
      revealHorizontalRightPadding: 30,
      minimap: { enabled: false },
      lineNumbers: "on",
      wordWrap: "on",
      wrappingIndent: "same",
      readOnly,
      fontFamily: "JetBrains Mono, Menlo, Monaco, Consolas, monospace",
      fontSize: 14,
      lineHeight: 1.6,
      padding: { top: 16, bottom: 16 },
      fontLigatures: true,
      renderWhitespace: "selection",
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      contextmenu: false,
      fixedOverflowWidgets: true,
    });

    // Add format command to the editor's context menu
    editor.addAction({
      id: "format-document",
      label: "Format Document",
      keybindings: [KeyMod.CtrlCmd | KeyCode.KeyS],
      contextMenuGroupId: "1_modification",
      contextMenuOrder: 1.5,
      run: formatDocument,
    });
  };

  return (
    <MonacoEditor
      height="100%"
      defaultLanguage="markdown"
      value={value}
      onChange={(value) => onChange(value || "")}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        lineNumbers: "on",
        wordWrap: "on",
        wrappingIndent: "same",
        readOnly,
        fontFamily: "JetBrains Mono, Menlo, Monaco, Consolas, monospace",
        fontSize: 14,
        lineHeight: 1.6,
        padding: { top: 16, bottom: 16 },
        fontLigatures: true,
        renderWhitespace: "selection",
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        contextmenu: false,
        fixedOverflowWidgets: true,
        scrollbar: {
          vertical: "visible",
          horizontal: "visible",
          useShadows: false,
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
      }}
      onMount={handleEditorDidMount}
      saveViewState={true}
    />
  );
}
