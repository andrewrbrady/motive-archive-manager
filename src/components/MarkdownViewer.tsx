"use client";

import React from "react";
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

export default function MarkdownViewer({
  content,
  filename,
}: MarkdownViewerProps) {
  return (
    <div className="rounded-lg border border-zinc-800 h-full">
      <div className="p-4 border-b border-zinc-800">
        <h3 className="text-lg font-semibold text-zinc-100">{filename}</h3>
      </div>
      <div className="p-6 prose prose-invert prose-table:border-zinc-800 max-w-none overflow-x-auto">
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
                <tbody className="divide-y divide-zinc-800">{children}</tbody>
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
  );
}
