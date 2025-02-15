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

interface MarkdownViewerProps {
  content: string;
  filename: string;
  onFocusFileList?: () => void;
}

interface CodeBlockProps {
  className?: string;
  children: React.ReactNode;
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
          <div className="prose prose-invert prose-table:border-zinc-800 max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code({ className, children }: CodeBlockProps) {
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
                    <code className={className}>{children}</code>
                  );
                },
                table({ children }: TableProps) {
                  return (
                    <div className="my-8 overflow-x-auto">
                      <table className="min-w-full border border-zinc-800 table-auto">
                        {children}
                      </table>
                    </div>
                  );
                },
                thead({ children }) {
                  return <thead className="bg-zinc-900">{children}</thead>;
                },
                tbody({ children }) {
                  return (
                    <tbody className="divide-y divide-zinc-800">
                      {children}
                    </tbody>
                  );
                },
                tr({ children }) {
                  return <tr className="hover:bg-zinc-900/50">{children}</tr>;
                },
                th({ children, align }: TableCellProps) {
                  return (
                    <th
                      className={`px-4 py-3 text-sm font-semibold border-b border-zinc-800 text-zinc-300 ${
                        align === "right"
                          ? "text-right"
                          : align === "center"
                          ? "text-center"
                          : "text-left"
                      }`}
                    >
                      {children}
                    </th>
                  );
                },
                td({ children, align }: TableCellProps) {
                  return (
                    <td
                      className={`px-4 py-3 text-sm border-zinc-800 text-zinc-400 ${
                        align === "right"
                          ? "text-right"
                          : align === "center"
                          ? "text-center"
                          : "text-left"
                      }`}
                    >
                      {children}
                    </td>
                  );
                },
                img({ src, alt }) {
                  return (
                    <img
                      src={src}
                      alt={alt}
                      className="rounded-lg border border-zinc-800"
                      loading="lazy"
                    />
                  );
                },
                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-4 border-zinc-700 pl-4 italic text-zinc-400">
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
                      className="text-blue-400 hover:text-blue-300 transition-colors"
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
