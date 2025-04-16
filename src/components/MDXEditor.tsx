"use client";

import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import * as monaco from "monaco-editor";
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
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KeyMod, KeyCode } from "monaco-editor";
import { parseFrontmatter } from "@/lib/mdx";
import { components as mdxComponents } from "@/components/mdx";
import Image from "next/image";
import { initVimMode } from "monaco-vim";

// Extend the Window interface to include Monaco's vim extension
declare global {
  interface Window {
    MonacoVim: {
      initVimMode: (
        editor: monaco.editor.IStandaloneCodeEditor,
        statusBarElement: HTMLElement
      ) => {
        dispose: () => void;
      };
    };
  }
}

// Dynamically import Monaco Editor with no SSR
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.Editor),
  { ssr: false }
);

// Custom components for MDX preview
const previewComponents = {
  ...mdxComponents,
  CoverImage: ({ src, alt }: { src: string; alt?: string }) => (
    <div className="w-full aspect-[2/1] relative mb-8 rounded-lg overflow-hidden">
      <img
        src={src}
        alt={alt || ""}
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  ),
  img: ({
    src,
    alt,
    className = "",
  }: {
    src?: string;
    alt?: string;
    className?: string;
  }) => (
    <figure className="my-8 max-w-3xl mx-auto">
      <div className="aspect-video relative overflow-hidden rounded-lg">
        {src ? (
          <img
            src={src}
            alt={alt || ""}
            className={cn(
              "absolute inset-0 w-full h-full object-cover",
              className
            )}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <span className="text-muted-foreground">No image</span>
          </div>
        )}
      </div>
      {alt && (
        <figcaption className="text-sm text-center mt-2">{alt}</figcaption>
      )}
    </figure>
  ),
  p: ({ children }: { children?: React.ReactNode }) => {
    // Convert children to array for easier processing
    const childArray = React.Children.toArray(children);

    // Check if any child is a block element
    const hasBlockElements = childArray.some((child) => {
      if (!React.isValidElement(child)) return false;
      const type =
        typeof child.type === "string" ? child.type : child.type?.name;
      return ["figure", "img", "pre"].includes(type?.toLowerCase() || "");
    });

    // If we have block elements, render them directly
    if (hasBlockElements) {
      return <>{children}</>;
    }

    // No block elements, render as normal paragraph
    return <p className="text-base leading-relaxed my-6">{children}</p>;
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-6">{children}</div>
  ),
  code: ({
    inline,
    className,
    children,
    ...props
  }: {
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
  }) => {
    const content = String(children).replace(/\n$/, "");

    if (inline) {
      return (
        <code className={className} {...props}>
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
          {...props}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code className={className} {...props}>
        {content}
      </code>
    );
  },
  Gallery: ({
    images,
  }: {
    images: { id: string; src: string; alt: string }[];
  }) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(() => {
          const openModal = (id: string) => {
            const dialog = document.getElementById(
              id
            ) as HTMLDialogElement | null;
            if (!dialog) return;
            dialog.showModal();

            const handleKeyPress = (e: KeyboardEvent) => {
              if (e.key === "ArrowRight") {
                navigateModal(id, "next");
              } else if (e.key === "ArrowLeft") {
                navigateModal(id, "prev");
              }
            };

            dialog.addEventListener("keydown", handleKeyPress);
            dialog.addEventListener("close", () => {
              window.removeEventListener("keydown", handleKeyPress);
            });
          };

          const closeModal = (e: React.MouseEvent) => {
            const target = e.target as HTMLElement;
            if (
              target.tagName.toLowerCase() === "dialog" ||
              target.classList.contains("close-btn")
            ) {
              const dialog = target.closest(
                "dialog"
              ) as HTMLDialogElement | null;
              if (dialog) dialog.close();
            }
          };

          const navigateModal = (
            currentId: string,
            direction: "next" | "prev"
          ) => {
            const currentIndex = images.findIndex(
              (img) => img.id === currentId
            );
            let nextIndex;

            if (direction === "next") {
              nextIndex = (currentIndex + 1) % images.length;
            } else {
              nextIndex = (currentIndex - 1 + images.length) % images.length;
            }

            const currentDialog = document.getElementById(
              currentId
            ) as HTMLDialogElement | null;
            const nextDialog = document.getElementById(
              images[nextIndex].id
            ) as HTMLDialogElement | null;
            if (currentDialog) currentDialog.close();
            if (nextDialog) nextDialog.showModal();
          };

          return (
            <>
              {images.map((image) => (
                <div key={image.id} className="aspect-w-16 aspect-h-12">
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-full object-cover rounded-lg cursor-pointer transition-opacity hover:opacity-90"
                    onClick={() => openModal(image.id)}
                  />
                  <dialog
                    id={image.id}
                    className="fixed inset-0 w-full h-full p-0 bg-transparent"
                    onClick={closeModal}
                  >
                    <div className="flex items-center justify-center min-h-screen p-4">
                      <div className="relative max-w-7xl mx-auto">
                        <button
                          className="close-btn absolute -top-12 right-0 text-white text-xl font-bold p-4 z-50"
                          onClick={closeModal}
                        >
                          ×
                        </button>
                        <button
                          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 text-white text-4xl font-bold p-4 z-50 hover:bg-black/20 rounded-full"
                          onClick={() => navigateModal(image.id, "prev")}
                        >
                          ‹
                        </button>
                        <img
                          src={image.src}
                          alt={image.alt}
                          className="max-h-[85vh] max-w-[85vw] w-auto h-auto object-contain"
                        />
                        <button
                          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 text-white text-4xl font-bold p-4 z-50 hover:bg-black/20 rounded-full"
                          onClick={() => navigateModal(image.id, "next")}
                        >
                          ›
                        </button>
                      </div>
                    </div>
                  </dialog>
                  <style jsx>{`
                    dialog {
                      width: 100vw;
                      height: 100vh;
                      max-width: 100vw;
                      max-height: 100vh;
                    }
                    dialog::backdrop {
                      background: rgba(0, 0, 0, 0.9);
                    }
                    dialog[open] {
                      display: block;
                    }
                  `}</style>
                </div>
              ))}
            </>
          );
        })()}
      </div>
    );
  },
};

// Define Monaco themes
const darkTheme = {
  base: "vs-dark",
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

interface MDXEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  onSave?: () => void;
}

export const MDXEditor: React.FC<MDXEditorProps> = ({
  value,
  onChange,
  onSave,
}) => {
  const [mounted, setMounted] = useState(false);
  const [mdxContent, setMdxContent] = useState<any>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const statusBarRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const vimModeRef = useRef<{ dispose: () => void } | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (vimModeRef.current) {
        vimModeRef.current.dispose();
      }
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const compileMdx = async () => {
      try {
        // Parse frontmatter and content
        const { frontmatter, content } = parseFrontmatter(value);

        // Create preview content with cover image if available
        const previewContent = `${
          frontmatter.cover
            ? `<CoverImage src="${frontmatter.cover}" alt="${
                frontmatter.title || ""
              }" />\n\n`
            : ""
        }${content}`;

        const compiled = await serialize(previewContent, {
          mdxOptions: {
            remarkPlugins: [remarkGfm, remarkMath],
            rehypePlugins: [rehypeKatex],
          },
        });
        setMdxContent(compiled);
      } catch (error) {
        console.error("Error compiling MDX:", error);
      }
    };

    compileMdx();
  }, [value]);

  const insertAtCursor = (text: string) => {
    if (!editorRef.current) return;

    const selection = editorRef.current.getSelection();
    if (!selection) return;

    const op = {
      range: {
        startLineNumber: selection.startLineNumber,
        startColumn: selection.startColumn,
        endLineNumber: selection.endLineNumber,
        endColumn: selection.endColumn,
      },
      text,
      forceMoveMarkers: true,
    };

    editorRef.current.executeEdits("insert-text", [op]);
  };

  // Add Vim mode configuration
  useEffect(() => {
    if (!editorRef.current || !statusBarRef.current) return;

    // Initialize Vim mode
    vimModeRef.current = initVimMode(editorRef.current, statusBarRef.current);

    // Configure the editor
    editorRef.current.updateOptions({
      lineNumbers: "on",
      wordWrap: "on",
      scrollBeyondLastLine: false,
      minimap: { enabled: false },
      fontSize: 14,
      automaticLayout: true,
    });

    // Add custom Vim commands
    const addAction = editorRef.current.addAction.bind(editorRef.current);

    addAction({
      id: "vim-save",
      label: "Save",
      keybindings: [],
      run: () => {
        if (onSave) {
          onSave();
          if (statusBarRef.current) {
            statusBarRef.current.textContent = "Saved";
            setTimeout(() => {
              if (statusBarRef.current) {
                statusBarRef.current.textContent = "";
              }
            }, 2000);
          }
        }
        return null;
      },
    });

    return () => {
      if (vimModeRef.current) {
        vimModeRef.current.dispose();
      }
    };
  }, [theme, onSave]);

  if (!mounted) {
    return (
      <div className="w-full h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      <div className="h-full overflow-y-auto p-4 prose prose-invert max-w-none">
        {mdxContent && (
          <MDXRemote {...mdxContent} components={previewComponents} />
        )}
      </div>
      <div className="h-full flex flex-col">
        <div className="flex-none p-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] flex items-center gap-2">
          <MediaSelector
            onSelect={(mdxCode) => {
              insertAtCursor(mdxCode);
            }}
          />
        </div>
        <div className="flex-1 relative">
          <MonacoEditor
            height="100%"
            defaultLanguage="markdown"
            theme={theme === "dark" ? "vs-dark" : "light"}
            value={value}
            onChange={onChange}
            onMount={(editor) => {
              editorRef.current = editor;
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: "on",
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
          <div
            ref={statusBarRef}
            className="absolute bottom-0 left-0 right-0 h-5 bg-[hsl(var(--background))] border-t border-[hsl(var(--border))] px-2 text-sm text-[hsl(var(--foreground))]"
          />
        </div>
      </div>
    </div>
  );
};
