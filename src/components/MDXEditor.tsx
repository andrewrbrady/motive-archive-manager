// @ts-nocheck
"use client";

// React and Next.js
import * as React from "react";
import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";

// Monaco Editor
import * as monaco from "monaco-editor";
import { KeyMod, KeyCode } from "monaco-editor";
import MonacoEditor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";

// MDX Processing
import { MDXRemote } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { parseFrontmatter } from "@/lib/mdx";

// Syntax Highlighting
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/use-toast";

// Icons
import {
  Download,
  Wand2,
  Code,
  Save,
  PanelLeftClose,
  PanelLeft,
  Images,
  X,
} from "lucide-react";

// Custom Components
import { useTheme } from "@/components/ThemeProvider";
import { MediaSelector } from "./mdx/MediaSelector";
import ArticleIntro from "./mdx/ArticleIntro";
import ImageGallery from "./mdx/ImageGallery";
import FullWidthGallery from "./mdx/FullWidthGallery";
import ArticleLayout from "./mdx/ArticleLayout";

// Utils
import { cn } from "@/lib/utils";

// Preview Components
const PreviewImage = ({
  src,
  alt,
  className = "",
}: {
  src?: string;
  alt?: string;
  className?: string;
}) => (
  <figure className="my-8">
    <div className="aspect-video relative">
      {src ? (
        <img
          src={src}
          alt={alt || ""}
          className={cn("w-full h-auto", className)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-muted-foreground">No image</span>
        </div>
      )}
    </div>
    {alt && (
      <figcaption className="text-sm text-center mt-2 text-muted-foreground">
        {alt}
      </figcaption>
    )}
  </figure>
);

const PreviewParagraph = ({ children }: { children?: React.ReactNode }) => {
  const childArray = React.Children.toArray(children);
  const hasBlockElements = childArray.some((child) => {
    if (!React.isValidElement(child)) return false;
    const type = typeof child.type === "string" ? child.type : child.type?.name;
    return ["figure", "img", "pre"].includes(type?.toLowerCase() || "");
  });

  return hasBlockElements ? (
    <>{children}</>
  ) : (
    <p className="prose-p">{children}</p>
  );
};

const PreviewCode = ({
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
};

// MDX Preview Components Map
const previewComponents = {
  ArticleIntro: ArticleIntro,
  ImageGallery: ImageGallery,
  FullWidthGallery: FullWidthGallery,
  ArticleLayout: ArticleLayout,
  img: PreviewImage,
  p: PreviewParagraph,
  pre: ({ children }: { children?: React.ReactNode }) => ({ children }),
  code: PreviewCode,
};

// Editor Component
const EditorWrapper = dynamic(() => import("./MonacoEditorWrapper"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  ),
});

// Define Monaco themes
const darkTheme = {
  base: "vs-dark",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#111111",
    "editor.foreground": "#ffffff",
  },
};

// Add proper types for the editor props
interface MDXEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  onSave?: () => void;
  onInsertGallery?: () => void;
}

export const MDXEditor: React.FC<MDXEditorProps> = ({
  value,
  onChange,
  onSave,
  onInsertGallery,
}: MDXEditorProps) => {
  if (process.env.NODE_ENV !== "production") {
    console.log("MDXEditor component initializing with props:", {
      hasValue: !!value,
      hasOnChange: !!onChange,
      hasOnSave: !!onSave,
      hasOnInsertGallery: !!onInsertGallery,
    });
  }

  const [mounted, setMounted] = useState(false);
  const [mdxContent, setMdxContent] = useState<any>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const statusBarRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const vimModeRef = useRef<{ dispose: () => void } | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isEnhancePopoverOpen, setIsEnhancePopoverOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);

  // New states for code completion
  const [isCompletionPopoverOpen, setIsCompletionPopoverOpen] = useState(false);
  const [autoCompletion, setAutoCompletion] = useState(false);
  const [completionPrompt, setCompletionPrompt] = useState<string>(
    "Continue writing from this point with relevant MDX content"
  );
  const [isGeneratingCompletion, setIsGeneratingCompletion] = useState(false);
  const [completionTemperature, setCompletionTemperature] = useState(0.5);
  const [completionMaxTokens, setCompletionMaxTokens] = useState(512);
  const [completionKeybinding, setCompletionKeybinding] =
    useState<monaco.editor.IDisposable | null>(null);

  const monacoRef = useRef<typeof monaco | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [compiledMdx, setCompiledMdx] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log("MDXEditor useEffect - setting mounted to true");
    }
    setMounted(true);
    return () => {
      if (process.env.NODE_ENV !== "production") {
        console.log("MDXEditor cleanup");
      }
    };
  }, []);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    if (process.env.NODE_ENV !== "production") {
      console.log("Editor mounted");
    }
    editorRef.current = editor;
    monacoRef.current = monaco;
    setIsEditorReady(true);

    // Configure editor
    editor.updateOptions({
      fontSize: 14,
      lineNumbers: "on",
      wordWrap: "on",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      lineHeight: 1.6,
      padding: { top: 16, bottom: 16 },
    });

    // Add save command
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyS, () => {
      onSave?.();
    });
  };

  // Single useEffect for Vim mode initialization
  useEffect(() => {
    if (!isEditorReady || !editorRef.current || !statusBarRef.current) {
      if (process.env.NODE_ENV !== "production") {
        console.log("Not ready for Vim initialization:", {
          isEditorReady,
          hasEditor: !!editorRef.current,
          hasStatusBar: !!statusBarRef.current,
        });
      }
      return;
    }

    const initializeVim = async () => {
      try {
        if (process.env.NODE_ENV !== "production") {
          console.log("Initializing Vim mode...");
        }
        const vim = await import("monaco-vim");

        // Cleanup any existing vim mode
        if (vimModeRef.current) {
          if (process.env.NODE_ENV !== "production") {
            console.log("Disposing existing Vim mode");
          }
          vimModeRef.current.dispose();
        }

        // Initialize new vim mode
        if (process.env.NODE_ENV !== "production") {
          console.log("Creating new Vim mode instance");
        }
        const vimMode = vim.initVimMode(
          editorRef.current,
          statusBarRef.current
        );
        vimModeRef.current = vimMode;
        if (process.env.NODE_ENV !== "production") {
          console.log("Vim mode initialized successfully");
        }
      } catch (error) {
        console.error("Error initializing Vim mode:", error);
      }
    };

    initializeVim();

    return () => {
      if (vimModeRef.current) {
        if (process.env.NODE_ENV !== "production") {
          console.log("Cleaning up Vim mode");
        }
        vimModeRef.current.dispose();
        vimModeRef.current = null;
      }
    };
  }, [isEditorReady]);

  // Set up auto-completion if enabled
  useEffect(() => {
    let completionTimeout: NodeJS.Timeout | null = null;

    if (autoCompletion && editorRef.current) {
      const disposable = editorRef.current.onDidChangeModelContent((e) => {
        // Clear any existing timeout
        if (completionTimeout) {
          clearTimeout(completionTimeout);
        }

        // Set a new timeout to generate completion after 1.5 seconds of inactivity
        completionTimeout = setTimeout(() => {
          // Only generate if not already generating and not in the middle of something else
          if (!isGeneratingCompletion && !isEnhancing) {
            generateCompletion();
          }
        }, 1500);
      });

      return () => {
        if (completionTimeout) {
          clearTimeout(completionTimeout);
        }
        disposable.dispose();
      };
    }

    return () => {
      if (completionTimeout) {
        clearTimeout(completionTimeout);
      }
    };
  }, [autoCompletion, isEditorReady, isGeneratingCompletion, isEnhancing]);

  useEffect(() => {
    if (!value) {
      if (process.env.NODE_ENV !== "production") {
        console.log("MDXEditor: No value provided");
      }
      return;
    }

    const compileMdx = async () => {
      try {
        if (process.env.NODE_ENV !== "production") {
          console.log("Starting MDX compilation");
        }
        const { frontmatter, content } = parseFrontmatter(value);
        if (process.env.NODE_ENV !== "production") {
          console.log("Parsed MDX:", {
            hasFrontmatter: !!frontmatter,
            contentLength: content.length,
          });
        }

        const mdxSource = await serialize(content, {
          mdxOptions: {
            remarkPlugins: [remarkGfm, remarkMath],
            rehypePlugins: [rehypeKatex],
            useDynamicImport: true,
          },
          scope: frontmatter,
        });

        if (process.env.NODE_ENV !== "production") {
          console.log("MDX compilation successful");
        }
        setMdxContent({ ...mdxSource, frontmatter });
      } catch (error) {
        console.error("Error compiling MDX:", error);
      }
    };

    compileMdx();
  }, [value]);

  const insertAtCursor = (text: string) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const position = editor.getPosition();
    const model = editor.getModel();

    if (position && model) {
      // Insert two newlines before and after the text
      const insertText = `\n\n${text}\n\n`;
      editor.executeEdits("insert-text", [
        {
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          },
          text: insertText,
        },
      ]);

      // Move cursor to end of inserted text
      const newPosition = editor.getPosition();
      if (newPosition) {
        editor.setPosition(newPosition);
        editor.revealPositionInCenter(newPosition);
      }
    }
  };

  // Function to download the MDX file
  const handleDownload = () => {
    try {
      // Parse frontmatter to get the slug
      const { frontmatter, content } = parseFrontmatter(value);

      // Use slug as filename, fallback to "document" if slug doesn't exist
      const filename = frontmatter.slug
        ? `${frontmatter.slug}.mdx`
        : "document.mdx";

      // Create blob with the content
      const blob = new Blob([value], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);

      // Create download link and trigger click
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  const getSelectedText = (): {
    text: string;
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  } | null => {
    if (!editorRef.current) return null;

    const selection = editorRef.current.getSelection();
    if (!selection) return null;

    const model = editorRef.current.getModel();
    if (!model) return null;

    const selectedText = model.getValueInRange(selection);
    if (!selectedText.trim()) return null;

    return {
      text: selectedText,
      startLineNumber: selection.startLineNumber,
      startColumn: selection.startColumn,
      endLineNumber: selection.endLineNumber,
      endColumn: selection.endColumn,
    };
  };

  const enhanceSelectedText = async () => {
    const selection = getSelectedText();
    if (!selection || isEnhancing) {
      toast({
        title: "Selection Required",
        description: "Please select some text to enhance.",
        variant: "destructive",
      });
      return;
    }

    if (!customPrompt.trim()) {
      toast({
        title: "Instructions Required",
        description: "Please provide instructions for Claude.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsEnhancing(true);
      setIsEnhancePopoverOpen(false);

      toast({
        title: "Enhancing Text",
        description: "Processing with Claude...",
      });

      const response = await fetch("/api/anthropic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: selection.text,
          prompt: customPrompt,
          temperature: temperature,
          maxTokens: maxTokens,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to enhance text");
      }

      const data = await response.json();

      if (data.enhancedText && editorRef.current) {
        const model = editorRef.current.getModel();
        if (!model) return;

        // Replace the selected text with the enhanced text
        editorRef.current.executeEdits("enhance-text", [
          {
            range: {
              startLineNumber: selection.startLineNumber,
              startColumn: selection.startColumn,
              endLineNumber: selection.endLineNumber,
              endColumn: selection.endColumn,
            },
            text: data.enhancedText,
            forceMoveMarkers: true,
          },
        ]);

        toast({
          title: "Success",
          description: "Text enhanced successfully!",
        });
      }
    } catch (error) {
      console.error("Error enhancing text:", error);
      toast({
        title: "Error",
        description: "Failed to enhance text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const generateCompletion = async () => {
    if (!editorRef.current || isGeneratingCompletion) return;

    try {
      setIsGeneratingCompletion(true);

      const model = editorRef.current.getModel();
      if (!model) return;

      const position = editorRef.current.getPosition();
      if (!position) return;

      // Get content before cursor to provide context
      const contentBeforeCursor = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      // Get a small amount of content after cursor for context
      const contentAfterCursor = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: Math.min(position.lineNumber + 10, model.getLineCount()),
        endColumn: 1,
      });

      const response = await fetch("/api/anthropic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: contentBeforeCursor,
          context: contentAfterCursor,
          prompt: completionPrompt,
          temperature: completionTemperature,
          maxTokens: completionMaxTokens,
          isCompletion: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate completion");
      }

      const data = await response.json();

      if (data.completion && editorRef.current) {
        // Insert the completion at the cursor position
        editorRef.current.executeEdits("generate-completion", [
          {
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
            text: data.completion,
            forceMoveMarkers: true,
          },
        ]);

        // Move cursor to end of inserted text
        const newPosition = editorRef.current.getPosition();
        if (newPosition) {
          editorRef.current.setPosition(newPosition);
          editorRef.current.revealPositionInCenter(newPosition);
        }
      }
    } catch (error) {
      console.error("Error generating completion:", error);
      toast({
        title: "Error",
        description: "Failed to generate completion. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCompletion(false);
    }
  };

  if (!mounted) {
    if (process.env.NODE_ENV !== "production") {
      console.log("MDXEditor not mounted yet");
    }
    return (
      <div className="w-full h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Loading editor...</p>
      </div>
    );
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("MDXEditor rendering with state:", {
      isMounted: mounted,
      hasMdxContent: !!mdxContent,
      hasEditorRef: !!editorRef.current,
    });
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 grid grid-cols-2 divide-x divide-[hsl(var(--border))]">
        <div className="h-full overflow-hidden bg-[hsl(var(--background))]">
          {mdxContent ? (
            <div className="h-full overflow-y-auto">
              <ArticleLayout frontmatter={{}}>
                <MDXRemote {...mdxContent} components={previewComponents} />
              </ArticleLayout>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-[hsl(var(--foreground-muted))]">
              Loading preview...
            </div>
          )}
        </div>
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between gap-2 px-2 py-1 border-b border-[hsl(var(--border))]">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                title={isSidebarOpen ? "Hide Preview" : "Show Preview"}
              >
                {isSidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeft className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={onInsertGallery}
                title="Insert Gallery"
              >
                <Images className="h-4 w-4" />
              </Button>

              {/* Add Enhance with Claude button */}
              <Popover
                open={isEnhancePopoverOpen}
                onOpenChange={setIsEnhancePopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 flex items-center gap-1"
                    title="Enhance selected text with Claude AI"
                    disabled={isEnhancing || isGeneratingCompletion}
                  >
                    <Wand2 className="h-4 w-4" />
                    Enhance
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <h4 className="font-medium leading-none">
                      Enhance Text with Claude
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Provide instructions for Claude to enhance the selected
                      text.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="custom-prompt">
                        Instructions for Claude
                      </Label>
                      <Textarea
                        id="custom-prompt"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Please improve this text by making it more concise and fixing any grammar issues..."
                        className="min-h-[100px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="temperature">
                          Temperature: {temperature.toFixed(1)}
                        </Label>
                      </div>
                      <Slider
                        id="temperature"
                        min={0}
                        max={1}
                        step={0.1}
                        value={[temperature]}
                        onValueChange={(value) => setTemperature(value[0])}
                        className="w-full bg-[hsl(var(--border))]"
                      />
                      <p className="text-xs text-muted-foreground">
                        Lower values are more focused, higher values more
                        creative
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="max-tokens">Max Tokens</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          id="max-tokens"
                          type="number"
                          min={100}
                          max={4096}
                          value={maxTokens}
                          onChange={(e) =>
                            setMaxTokens(parseInt(e.target.value) || 1024)
                          }
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Maximum length of the enhanced text (100-4096)
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={enhanceSelectedText}
                        disabled={isEnhancing}
                      >
                        {isEnhancing ? "Enhancing..." : "Enhance Text"}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Add Completion with Claude button */}
              <Popover
                open={isCompletionPopoverOpen}
                onOpenChange={setIsCompletionPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 flex items-center gap-1"
                    title="Generate code completion with Claude AI"
                    disabled={isGeneratingCompletion || isEnhancing}
                  >
                    <Code className="h-4 w-4" />
                    Complete
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <h4 className="font-medium leading-none">
                      AI Completion Settings
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Configure how Claude generates completions for your MDX
                      content.
                    </p>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-completion">Auto-completion</Label>
                      <Switch
                        id="auto-completion"
                        checked={autoCompletion}
                        onCheckedChange={setAutoCompletion}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      When enabled, Claude will automatically suggest
                      completions when you pause typing.
                    </p>

                    <div className="space-y-2">
                      <Label htmlFor="completion-prompt">
                        Completion Instructions
                      </Label>
                      <Textarea
                        id="completion-prompt"
                        value={completionPrompt}
                        onChange={(e) => setCompletionPrompt(e.target.value)}
                        placeholder="Continue writing from this point with relevant MDX content"
                        className="min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="completion-temperature">
                          Temperature: {completionTemperature.toFixed(1)}
                        </Label>
                      </div>
                      <Slider
                        id="completion-temperature"
                        min={0}
                        max={1}
                        step={0.1}
                        value={[completionTemperature]}
                        onValueChange={(value) =>
                          setCompletionTemperature(value[0])
                        }
                        className="w-full bg-[hsl(var(--border))]"
                      />
                      <p className="text-xs text-muted-foreground">
                        Lower values for predictable completions, higher for
                        creative ones
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="completion-max-tokens">
                          Max Tokens
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          id="completion-max-tokens"
                          type="number"
                          min={50}
                          max={2048}
                          value={completionMaxTokens}
                          onChange={(e) =>
                            setCompletionMaxTokens(
                              parseInt(e.target.value) || 512
                            )
                          }
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Maximum length of generated completions (50-2048)
                      </p>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-xs text-muted-foreground">
                        Press Ctrl+Space to trigger manually
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setIsCompletionPopoverOpen(false);
                          generateCompletion();
                        }}
                        disabled={isGeneratingCompletion}
                      >
                        {isGeneratingCompletion
                          ? "Generating..."
                          : "Generate Now"}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={handleDownload}
                title="Download MDX File"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 relative">
            <MonacoEditor
              height="100%"
              defaultLanguage="markdown"
              value={value}
              onChange={onChange}
              theme={theme === "dark" ? "vs-dark" : "vs-light"}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: "on",
                lineNumbers: "on",
                renderWhitespace: "boundary",
                scrollBeyondLastLine: false,
              }}
            />
            <div
              ref={statusBarRef}
              id="vim-status-bar"
              className="absolute bottom-0 left-0 right-0 h-5 bg-[hsl(var(--background))] border-t border-[hsl(var(--border))] px-2 text-sm text-[hsl(var(--foreground))]"
            />
          </div>
        </div>
      </div>
      <div className="flex-none h-6 px-2 border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] flex items-center justify-between text-xs text-[hsl(var(--foreground-muted))]">
        <div>MDX Editor</div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={onSave}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

// Ensure we have a proper default export that references the named export
export default MDXEditor;
