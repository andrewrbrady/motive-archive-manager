"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type * as monaco from "monaco-editor";
import { cn } from "@/lib/utils";
import { MDXRemote } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useTheme } from "@/components/ThemeProvider";
import { MediaSelector } from "./mdx/MediaSelector";
import prettier from "prettier/standalone";
import * as monacoEditor from "monaco-editor";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

// Dynamically import Monaco Editor
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

// Define custom Monaco themes
const darkTheme = {
  base: "vs-dark" as const,
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#111111",
    "editor.foreground": "#ffffff",
    "editor.lineHighlightBackground": "#1a1a1a",
    "editor.selectionBackground": "#27272a",
    "editor.inactiveSelectionBackground": "#27272a80",
    "editorCursor.foreground": "#ffffff",
    "editorLineNumber.foreground": "#71717a",
    "editorLineNumber.activeForeground": "#a1a1aa",
    "editor.selectionHighlightBackground": "#27272a80",
    "editor.wordHighlightBackground": "#27272a80",
    "editor.wordHighlightStrongBackground": "#27272a80",
    "editor.findMatchBackground": "#27272a80",
    "editor.findMatchHighlightBackground": "#27272a40",
    "editorBracketMatch.background": "#27272a80",
    "editorBracketMatch.border": "#3f3f46",
  },
};

const lightTheme = {
  base: "vs" as const,
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#ffffff",
    "editor.foreground": "#18181b",
    "editor.lineHighlightBackground": "#f4f4f5",
    "editor.selectionBackground": "#e4e4e7",
    "editor.inactiveSelectionBackground": "#e4e4e780",
    "editorCursor.foreground": "#18181b",
    "editorLineNumber.foreground": "#71717a",
    "editorLineNumber.activeForeground": "#52525b",
    "editor.selectionHighlightBackground": "#e4e4e780",
    "editor.wordHighlightBackground": "#e4e4e780",
    "editor.wordHighlightStrongBackground": "#e4e4e780",
    "editor.findMatchBackground": "#e4e4e780",
    "editor.findMatchHighlightBackground": "#e4e4e740",
    "editorBracketMatch.background": "#e4e4e780",
    "editorBracketMatch.border": "#d4d4d8",
  },
};

interface MDXEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

interface MDXFrontmatter {
  title?: string;
  subtitle?: string;
  cover?: string;
  author?: string;
  tags?: string[];
  slug?: string;
  [key: string]: any;
}

// Custom components for MDX
interface MDXComponentProps {
  src?: string;
  alt?: string;
  className?: string;
  children?: React.ReactNode;
  inline?: boolean;
  [key: string]: any;
}

const components = {
  img: ({ src, alt, className = "" }: MDXComponentProps) => (
    <div className="my-8 max-w-3xl mx-auto">
      <div className="aspect-video relative overflow-hidden rounded-lg">
        <img
          src={src}
          alt={alt}
          className={cn(
            "absolute inset-0 w-full h-full object-cover",
            className
          )}
        />
      </div>
    </div>
  ),
  div: ({ className = "", children, ...props }: MDXComponentProps) => (
    <div className={cn(className)} {...props}>
      {children}
    </div>
  ),
  h1: ({ children }: MDXComponentProps) => (
    <h1 className="text-4xl font-bold mb-4">{children}</h1>
  ),
  h2: ({ children }: MDXComponentProps) => (
    <h2 className="text-2xl font-bold mb-4">{children}</h2>
  ),
  p: ({ children, className, ...props }: MDXComponentProps) => {
    // Convert children to array for easier processing
    const childArray = React.Children.toArray(children);

    // Check if any child is a block element
    const hasBlockElements = childArray.some((child) => {
      if (!React.isValidElement(child)) return false;
      const type =
        typeof child.type === "string" ? child.type : child.type?.name;
      return ["div", "img", "pre"].includes(type?.toLowerCase() || "");
    });

    // If we have block elements, wrap each child in a div
    if (hasBlockElements) {
      return (
        <div className={cn("my-6 space-y-6", className)} {...props}>
          {childArray.map((child, index) => {
            if (!React.isValidElement(child)) {
              return (
                <div key={index} className="text-base leading-relaxed">
                  {child}
                </div>
              );
            }
            const type =
              typeof child.type === "string" ? child.type : child.type?.name;
            return type?.toLowerCase() === "p" ? (
              child
            ) : (
              <div key={index}>{child}</div>
            );
          })}
        </div>
      );
    }

    // No block elements, render as normal paragraph
    return (
      <p className={cn("my-6 text-base leading-relaxed", className)} {...props}>
        {children}
      </p>
    );
  },
  pre: ({ children }: MDXComponentProps) => (
    <div className="my-6">{children}</div>
  ),
  code: ({ inline, className, children, ...props }: MDXComponentProps) => {
    const content = String(children).replace(/\n$/, "");

    // Remove jsx attribute from props if it's a boolean
    const { jsx, ...restProps } = props;

    if (inline) {
      return (
        <code className={className} {...restProps}>
          {content}
        </code>
      );
    }
    const match = /language-(\w+)/.exec(className || "");
    return match ? (
      <div className="my-6">
        <SyntaxHighlighter
          style={oneDark}
          language={match[1]}
          PreTag="div"
          {...restProps}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code className={className} {...restProps}>
        {content}
      </code>
    );
  },
};

function parseFrontmatter(content: string = ""): {
  frontmatter: Record<string, any>;
  content: string;
} {
  if (!content) {
    return { frontmatter: {}, content: "" };
  }

  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, content };
  }

  const [, frontmatterStr, remainingContent] = match;
  const frontmatter: Record<string, any> = {};

  frontmatterStr.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split(":");
    if (key && valueParts.length) {
      let value = valueParts.join(":").trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      if (value.startsWith("[") && value.endsWith("]")) {
        frontmatter[key.trim()] = value
          .slice(1, -1)
          .split(",")
          .map((item) => item.trim().replace(/"/g, ""));
      } else {
        frontmatter[key.trim()] = value;
      }
    }
  });

  return { frontmatter, content: remainingContent.trim() };
}

export default function MDXEditor({
  value,
  onChange,
  readOnly = false,
}: MDXEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const vimModeRef = useRef<any>(null);
  const statusBarRef = useRef<HTMLDivElement>(null);
  const [isVimMode, setIsVimMode] = useState(true);
  const [mdxSource, setMdxSource] = useState<any>(null);
  const { frontmatter, content } = parseFrontmatter(value);
  const { theme } = useTheme();

  // Format the current editor content
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

  // Add keyboard shortcut for formatting
  useEffect(() => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const disposable = editor.addAction({
      id: "format-document",
      label: "Format Document",
      keybindings: [monacoEditor.KeyMod.CtrlCmd | monacoEditor.KeyCode.KeyS],
      run: formatDocument,
    });

    return () => {
      disposable.dispose();
    };
  }, []);

  // Define Monaco editor before mount handler
  const handleEditorBeforeMount = (monaco: typeof import("monaco-editor")) => {
    monaco.editor.defineTheme("motive-dark", darkTheme);
    monaco.editor.defineTheme("motive-light", lightTheme);
  };

  useEffect(() => {
    const compileMDX = async () => {
      try {
        const mdxSource = await serialize(content, {
          mdxOptions: {
            remarkPlugins: [remarkGfm, remarkMath],
            rehypePlugins: [rehypeKatex],
          },
        });
        setMdxSource(mdxSource);
      } catch (error) {
        console.error("Failed to compile MDX:", error);
      }
    };

    compileMDX();
  }, [content]);

  useEffect(() => {
    let isMounted = true;

    const initializeVimMode = async () => {
      if (
        editorRef.current &&
        isVimMode &&
        !vimModeRef.current &&
        statusBarRef.current
      ) {
        try {
          const { initVimMode } = await import("monaco-vim");
          if (isMounted) {
            vimModeRef.current = initVimMode(
              editorRef.current,
              statusBarRef.current
            );
          }
        } catch (error) {
          console.error("Failed to initialize vim mode:", error);
        }
      }
    };

    initializeVimMode();

    return () => {
      isMounted = false;
      if (vimModeRef.current) {
        vimModeRef.current.dispose();
        vimModeRef.current = null;
      }
    };
  }, [isVimMode]);

  const handleEditorDidMount = (
    editor: monaco.editor.IStandaloneCodeEditor
  ) => {
    editorRef.current = editor;

    // Set editor theme and options
    editor.updateOptions({
      theme: "motive-dark",
      scrollbar: {
        vertical: "visible",
        horizontal: "visible",
        useShadows: false,
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
      },
      revealHorizontalRightPadding: 30,
    });

    // Add format command to the editor's context menu
    editor.addAction({
      id: "format-document",
      label: "Format Document",
      keybindings: [monacoEditor.KeyMod.CtrlCmd | monacoEditor.KeyCode.KeyS],
      contextMenuGroupId: "1_modification",
      contextMenuOrder: 1.5,
      run: formatDocument,
    });

    if (isVimMode && statusBarRef.current) {
      import("monaco-vim").then(({ initVimMode }) => {
        if (statusBarRef.current) {
          vimModeRef.current = initVimMode(editor, statusBarRef.current);
        }
      });
    }
  };

  const handleMediaSelect = (mdxCode: string) => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const selection = editor.getSelection();
      if (selection) {
        editor.executeEdits("media-insert", [
          {
            range: selection,
            text: mdxCode,
          },
        ]);
      }
    }
  };

  const handleDownload = () => {
    const content = editorRef.current?.getValue() || value;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const filename = frontmatter.slug
      ? `${frontmatter.slug}.mdx`
      : frontmatter.title
        ? `${frontmatter.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.mdx`
        : "untitled.mdx";

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full">
      {/* Preview */}
      <div className="w-1/2 border-r border-[hsl(var(--border))] bg-[hsl(var(--background))] overflow-hidden">
        <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#111111] [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full">
          {frontmatter.cover && (
            <div className="w-full h-64 relative">
              <img
                src={frontmatter.cover}
                alt={frontmatter.title || "Cover image"}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-8">
            {frontmatter.title && (
              <h1 className="text-4xl font-bold mb-4">{frontmatter.title}</h1>
            )}
            {frontmatter.subtitle && (
              <h2 className="text-xl text-[hsl(var(--foreground-muted))] mb-8">
                {frontmatter.subtitle}
              </h2>
            )}
            <div className="prose prose-invert max-w-none">
              {mdxSource && (
                <MDXRemote
                  {...mdxSource}
                  components={components}
                  jsx={"true"}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="w-1/2 flex flex-col">
        <div className="flex-none p-2 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <MediaSelector onSelect={handleMediaSelect} />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-8"
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
        <div className="flex-1 bg-[#111111]">
          <div
            ref={statusBarRef}
            className="absolute top-0 right-0 z-10 p-1 text-xs text-[hsl(var(--foreground-muted))]"
          />
          <Editor
            height="100%"
            defaultLanguage="markdown"
            value={value}
            onChange={(value) => onChange(value || "")}
            theme="motive-dark"
            beforeMount={handleEditorBeforeMount}
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
        </div>
      </div>
    </div>
  );
}
