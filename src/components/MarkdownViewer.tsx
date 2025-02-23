"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
} from "react";
import ReactMarkdown from "react-markdown";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Components } from "react-markdown";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

interface MarkdownViewerProps {
  content: string;
  filename: string;
  onFocusFileList?: () => void;
}

interface CodeProps extends ComponentPropsWithoutRef<"code"> {
  inline?: boolean;
}

interface TableProps {
  children: React.ReactNode;
}

interface TableCellProps {
  children: React.ReactNode;
  isHeader?: boolean;
  align?: "left" | "center" | "right";
}

const MarkdownViewer = forwardRef<HTMLDivElement, MarkdownViewerProps>(
  ({ content, filename, onFocusFileList }, ref) => {
    const [bounce, setBounce] = useState<"top" | "bottom" | null>(null);
    const bounceTimeout = useRef<NodeJS.Timeout>();
    const contentRef = useRef<HTMLDivElement>(null);
    const [isVimMode, setIsVimMode] = useState(true);

    const handleBounce = (element: HTMLDivElement) => {
      const isAtTop = element.scrollTop === 0;
      const isAtBottom =
        Math.abs(
          element.scrollHeight - element.scrollTop - element.clientHeight
        ) < 1;

      // Clear any existing timeout
      if (bounceTimeout.current) {
        clearTimeout(bounceTimeout.current);
        bounceTimeout.current = undefined;
      }

      // Reset bounce state when not at boundaries
      if (!isAtTop && !isAtBottom) {
        setBounce(null);
        return;
      }

      // Set bounce state based on position
      if (isAtTop) {
        setBounce("top");
      } else if (isAtBottom) {
        setBounce("bottom");
      }

      // Clear bounce state after animation
      bounceTimeout.current = setTimeout(() => {
        setBounce(null);
        bounceTimeout.current = undefined;
      }, 150);
    };

    const scrollBy = useCallback((pixels: number, smooth: boolean = false) => {
      if (contentRef.current) {
        contentRef.current.scrollBy({
          top: pixels,
          behavior: smooth ? "smooth" : "auto",
        });
      }
    }, []);

    const scrollToPosition = useCallback((position: "top" | "bottom") => {
      if (contentRef.current) {
        contentRef.current.scrollTo({
          top: position === "top" ? 0 : contentRef.current.scrollHeight,
          behavior: "auto",
        });
      }
    }, []);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        // Only handle events when this component or its children have focus
        if (!ref || typeof ref === "function") return;
        if (!ref.current?.contains(document.activeElement)) return;
        if (!isVimMode) return;

        // Ignore if we're in an input or contenteditable element
        if (
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA" ||
          document.activeElement?.getAttribute("contenteditable") === "true"
        ) {
          return;
        }

        switch (e.key.toLowerCase()) {
          case "arrowleft":
          case "h":
            if (onFocusFileList) {
              onFocusFileList();
              e.preventDefault();
            }
            break;
          case "j":
            scrollBy(e.shiftKey ? 200 : 100);
            e.preventDefault();
            break;
          case "k":
            scrollBy(e.shiftKey ? -200 : -100);
            e.preventDefault();
            break;
          case "d":
            if (e.ctrlKey || e.metaKey) {
              scrollBy(contentRef.current?.clientHeight ?? 0);
              e.preventDefault();
            }
            break;
          case "u":
            if (e.ctrlKey || e.metaKey) {
              scrollBy(-(contentRef.current?.clientHeight ?? 0));
              e.preventDefault();
            }
            break;
          case "g":
            if (e.shiftKey) {
              scrollToPosition("bottom");
            } else {
              scrollToPosition("top");
            }
            e.preventDefault();
            break;
          case " ":
            scrollBy(contentRef.current?.clientHeight ?? 0);
            e.preventDefault();
            break;
          case "escape":
            setIsVimMode(true);
            e.preventDefault();
            break;
          case "i":
            setIsVimMode(false);
            e.preventDefault();
            break;
        }
      },
      [scrollBy, scrollToPosition, isVimMode, onFocusFileList, ref]
    );

    useEffect(() => {
      return () => {
        if (bounceTimeout.current) {
          clearTimeout(bounceTimeout.current);
        }
      };
    }, []);

    return (
      <div
        ref={ref}
        className="flex flex-col h-full overflow-hidden focus:outline-none focus:ring-[0.5px] focus:ring-zinc-700/50"
        tabIndex={0}
        onFocus={() => setIsVimMode(true)}
        onKeyDown={(e: React.KeyboardEvent) => {
          // Handle keyboard events directly on the component
          if (isVimMode) {
            switch (e.key.toLowerCase()) {
              case "arrowleft":
              case "h":
                if (onFocusFileList) {
                  onFocusFileList();
                  e.preventDefault();
                }
                break;
              case "j":
                scrollBy(e.shiftKey ? 200 : 100);
                e.preventDefault();
                break;
              case "k":
                scrollBy(e.shiftKey ? -200 : -100);
                e.preventDefault();
                break;
              case "d":
                if (e.ctrlKey || e.metaKey) {
                  scrollBy(contentRef.current?.clientHeight ?? 0);
                  e.preventDefault();
                }
                break;
              case "u":
                if (e.ctrlKey || e.metaKey) {
                  scrollBy(-(contentRef.current?.clientHeight ?? 0));
                  e.preventDefault();
                }
                break;
              case "g":
                if (e.shiftKey) {
                  scrollToPosition("bottom");
                } else {
                  scrollToPosition("top");
                }
                e.preventDefault();
                break;
              case " ":
                scrollBy(contentRef.current?.clientHeight ?? 0);
                e.preventDefault();
                break;
              case "escape":
                setIsVimMode(true);
                e.preventDefault();
                break;
              case "i":
                setIsVimMode(false);
                e.preventDefault();
                break;
            }
          }
        }}
      >
        <div
          ref={contentRef}
          className={`flex-1 overflow-y-auto min-h-0 p-4 scrollbar-thin scrollbar-thumb-zinc-800 overscroll-none transition-transform duration-200 ${
            bounce === "top"
              ? "translate-y-[10px]"
              : bounce === "bottom"
              ? "-translate-y-[10px]"
              : ""
          }`}
          onScroll={(e) => handleBounce(e.currentTarget)}
          onWheel={(e) => {
            const element = e.currentTarget;
            const isAtTop = element.scrollTop === 0;
            const isAtBottom =
              Math.abs(
                element.scrollHeight - element.scrollTop - element.clientHeight
              ) < 1;

            if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
              e.preventDefault();
            }
          }}
        >
          <div className="prose prose-invert prose-table:border-[hsl(var(--border))] max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code: ({
                  inline,
                  className,
                  children,
                  ...props
                }: CodeProps) => {
                  if (inline) {
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                  const match = /language-(\w+)/.exec(className || "");
                  return match ? (
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                table: ({ children, ...props }) => (
                  <div className="my-8 overflow-x-auto">
                    <table
                      className="min-w-full border border-[hsl(var(--border))] table-auto"
                      {...props}
                    >
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children, ...props }) => (
                  <thead className="bg-[hsl(var(--background))]" {...props}>
                    {children}
                  </thead>
                ),
                tbody: ({ children, ...props }) => (
                  <tbody className="divide-y divide-zinc-800" {...props}>
                    {children}
                  </tbody>
                ),
                tr: ({ children, ...props }) => (
                  <tr className="hover:bg-[hsl(var(--background))] bg-opacity-50" {...props}>
                    {children}
                  </tr>
                ),
                th: ({ children, align, ...props }) => (
                  <th
                    className={cn(
                      "border border-[hsl(var(--border))] px-4 py-2 text-left",
                      align === "center" && "text-center",
                      align === "right" && "text-right"
                    )}
                    {...props}
                  >
                    {children}
                  </th>
                ),
                td: ({ children, align, ...props }) => (
                  <td
                    className={cn(
                      "border border-[hsl(var(--border))] px-4 py-2 text-left",
                      align === "center" && "text-center",
                      align === "right" && "text-right"
                    )}
                    {...props}
                  >
                    {children}
                  </td>
                ),
                img({ src, alt }) {
                  return (
                    <img
                      src={src}
                      alt={alt}
                      className="rounded-lg border border-[hsl(var(--border))]"
                      loading="lazy"
                    />
                  );
                },
                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-4 border-[hsl(var(--border-subtle))] pl-4 italic text-[hsl(var(--foreground-muted))]">
                      {children}
                    </blockquote>
                  );
                },
                a({ children, href }) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-info-400 hover:text-info-300 transition-colors"
                    >
                      {children}
                    </a>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }
);

MarkdownViewer.displayName = "MarkdownViewer";

export default MarkdownViewer;
