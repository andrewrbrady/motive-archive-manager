"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

interface MarkdownViewerProps {
  content: string;
  filename: string;
}

interface CodeBlockProps {
  className?: string;
  children: React.ReactNode;
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
      <div className="p-6 prose prose-invert max-w-none">
        <ReactMarkdown
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
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
