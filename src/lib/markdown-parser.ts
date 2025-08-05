import {
  ContentBlock,
  TextBlock,
  ImageBlock,
  DividerBlock,
  ListBlock,
  HTMLBlock,
} from "@/components/content-studio/types";

/**
 * Markdown Parser for Block Composer
 * Converts markdown text into appropriate ContentBlock objects
 */

export interface MarkdownParseResult {
  blocks: ContentBlock[];
  errors: string[];
}

/**
 * Parse markdown text and convert it to content blocks
 */
export function parseMarkdownToBlocks(markdown: string): MarkdownParseResult {
  const blocks: ContentBlock[] = [];
  const errors: string[] = [];

  if (!markdown.trim()) {
    return { blocks, errors };
  }

  // Split markdown into lines and process
  const lines = markdown.split("\n");
  let currentIndex = 0;
  let order = 0;

  while (currentIndex < lines.length) {
    const line = lines[currentIndex].trim();

    // Skip empty lines
    if (!line) {
      currentIndex++;
      continue;
    }

    // Parse headings (h1-h6)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      const content = headingMatch[2];

      const headingBlock: TextBlock = {
        id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${order}`,
        type: "text",
        order,
        content,
        element: `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6",
        styles: {},
        metadata: {
          source: "markdown-paste",
          createdAt: new Date().toISOString(),
        },
      };

      blocks.push(headingBlock);
      order++;
      currentIndex++;
      continue;
    }

    // Parse horizontal rules
    if (line.match(/^[-*_]{3,}$/)) {
      const dividerBlock: DividerBlock = {
        id: `divider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${order}`,
        type: "divider",
        order,
        thickness: "1px",
        color: "#dddddd",
        margin: "20px",
        styles: {},
        metadata: {
          source: "markdown-paste",
          createdAt: new Date().toISOString(),
        },
      };

      blocks.push(dividerBlock);
      order++;
      currentIndex++;
      continue;
    }

    // Parse images
    const imageMatch = line.match(/^\!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      const altText = imageMatch[1];
      const imageUrl = imageMatch[2];

      const imageBlock: ImageBlock = {
        id: `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${order}`,
        type: "image",
        order,
        imageUrl,
        altText,
        width: "100%",
        alignment: "center",
        styles: {},
        metadata: {
          source: "markdown-paste",
          createdAt: new Date().toISOString(),
        },
      };

      blocks.push(imageBlock);
      order++;
      currentIndex++;
      continue;
    }

    // Parse unordered lists
    if (line.match(/^[-*+]\s+/)) {
      const listItems: string[] = [];
      let listCurrentIndex = currentIndex;

      // Collect all consecutive list items
      while (listCurrentIndex < lines.length) {
        const listLine = lines[listCurrentIndex].trim();
        const listMatch = listLine.match(/^[-*+]\s+(.+)$/);

        if (listMatch) {
          listItems.push(listMatch[1]);
          listCurrentIndex++;
        } else if (listLine === "") {
          // Skip empty lines within lists
          listCurrentIndex++;
        } else {
          break;
        }
      }

      if (listItems.length > 0) {
        const listBlock: ListBlock = {
          id: `list-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${order}`,
          type: "list",
          order,
          items: listItems,
          style: "ul",
          styles: {},
          metadata: {
            source: "markdown-paste",
            createdAt: new Date().toISOString(),
          },
        };

        blocks.push(listBlock);
        order++;
        currentIndex = listCurrentIndex;
        continue;
      }
    }

    // Parse ordered lists
    if (line.match(/^\d+\.\s+/)) {
      const listItems: string[] = [];
      let listCurrentIndex = currentIndex;

      // Collect all consecutive list items
      while (listCurrentIndex < lines.length) {
        const listLine = lines[listCurrentIndex].trim();
        const listMatch = listLine.match(/^\d+\.\s+(.+)$/);

        if (listMatch) {
          listItems.push(listMatch[1]);
          listCurrentIndex++;
        } else if (listLine === "") {
          // Skip empty lines within lists
          listCurrentIndex++;
        } else {
          break;
        }
      }

      if (listItems.length > 0) {
        const listBlock: ListBlock = {
          id: `list-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${order}`,
          type: "list",
          order,
          items: listItems,
          style: "ol",
          styles: {},
          metadata: {
            source: "markdown-paste",
            createdAt: new Date().toISOString(),
          },
        };

        blocks.push(listBlock);
        order++;
        currentIndex = listCurrentIndex;
        continue;
      }
    }

    // Parse code blocks
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      currentIndex++; // Skip opening ```

      while (currentIndex < lines.length) {
        const codeLine = lines[currentIndex];

        if (codeLine.trim() === "```") {
          // End of code block
          currentIndex++;
          break;
        }

        codeLines.push(codeLine);
        currentIndex++;
      }

      const codeContent = codeLines.join("\n");
      const htmlBlock: HTMLBlock = {
        id: `html-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${order}`,
        type: "html",
        order,
        content: `<pre><code>${escapeHtml(codeContent)}</code></pre>`,
        description: "Code Block (from markdown)",
        styles: {},
        metadata: {
          source: "markdown-paste",
          createdAt: new Date().toISOString(),
        },
      };

      blocks.push(htmlBlock);
      order++;
      continue;
    }

    // Parse blockquotes
    if (line.startsWith(">")) {
      const blockquoteLines: string[] = [];
      let blockquoteCurrentIndex = currentIndex;

      // Collect all consecutive blockquote lines
      while (blockquoteCurrentIndex < lines.length) {
        const quoteLine = lines[blockquoteCurrentIndex].trim();

        if (quoteLine.startsWith(">")) {
          blockquoteLines.push(quoteLine.substring(1).trim());
          blockquoteCurrentIndex++;
        } else if (quoteLine === "") {
          // Skip empty lines within blockquotes
          blockquoteCurrentIndex++;
        } else {
          break;
        }
      }

      if (blockquoteLines.length > 0) {
        const blockquoteContent = blockquoteLines.join(" ");
        const htmlBlock: HTMLBlock = {
          id: `html-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${order}`,
          type: "html",
          order,
          content: `<blockquote><p>${escapeHtml(blockquoteContent)}</p></blockquote>`,
          description: "Blockquote (from markdown)",
          styles: {},
          metadata: {
            source: "markdown-paste",
            createdAt: new Date().toISOString(),
          },
        };

        blocks.push(htmlBlock);
        order++;
        currentIndex = blockquoteCurrentIndex;
        continue;
      }
    }

    // Parse regular paragraphs (collect multi-line paragraphs)
    const paragraphLines: string[] = [line];
    currentIndex++;

    // Collect consecutive non-empty lines for the paragraph
    while (currentIndex < lines.length) {
      const nextLine = lines[currentIndex].trim();

      // Stop if we hit an empty line or a markdown element
      if (
        !nextLine ||
        nextLine.match(/^#{1,6}\s+/) ||
        nextLine.match(/^[-*_]{3,}$/) ||
        nextLine.match(/^\!\[/) ||
        nextLine.match(/^[-*+]\s+/) ||
        nextLine.match(/^\d+\.\s+/) ||
        nextLine.startsWith("```") ||
        nextLine.startsWith(">")
      ) {
        break;
      }

      paragraphLines.push(nextLine);
      currentIndex++;
    }

    // Process inline markdown in the paragraph content
    const paragraphContent = paragraphLines.join(" ");
    const processedContent = processInlineMarkdown(paragraphContent);

    const textBlock: TextBlock = {
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${order}`,
      type: "text",
      order,
      content: processedContent.text,
      element: "p",
      styles: {},
      metadata: {
        source: "markdown-paste",
        createdAt: new Date().toISOString(),
      },
      ...(processedContent.hasFormatting && {
        richFormatting: {
          enabled: true,
          formattedContent: processedContent.html,
          hasLinks: processedContent.hasLinks,
          hasBold: processedContent.hasBold,
        },
      }),
    };

    blocks.push(textBlock);
    order++;
  }

  return { blocks, errors };
}

/**
 * Process inline markdown formatting (bold, italic, links)
 */
function processInlineMarkdown(text: string): {
  text: string;
  html: string;
  hasFormatting: boolean;
  hasLinks: boolean;
  hasBold: boolean;
} {
  let html = text;
  let hasFormatting = false;
  let hasLinks = false;
  let hasBold = false;

  // Process links first: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
    hasFormatting = true;
    hasLinks = true;
    return `<a href="${escapeHtml(url)}">${escapeHtml(linkText)}</a>`;
  });

  // Process bold: **text** or __text__
  html = html.replace(/\*\*([^*]+)\*\*/g, (match, boldText) => {
    hasFormatting = true;
    hasBold = true;
    return `<strong>${escapeHtml(boldText)}</strong>`;
  });

  html = html.replace(/__([^_]+)__/g, (match, boldText) => {
    hasFormatting = true;
    hasBold = true;
    return `<strong>${escapeHtml(boldText)}</strong>`;
  });

  // Process italic: *text* or _text_
  html = html.replace(/\*([^*]+)\*/g, (match, italicText) => {
    hasFormatting = true;
    return `<em>${escapeHtml(italicText)}</em>`;
  });

  html = html.replace(/_([^_]+)_/g, (match, italicText) => {
    hasFormatting = true;
    return `<em>${escapeHtml(italicText)}</em>`;
  });

  // Process inline code: `code`
  html = html.replace(/`([^`]+)`/g, (match, codeText) => {
    hasFormatting = true;
    return `<code>${escapeHtml(codeText)}</code>`;
  });

  // Create plain text version without markdown syntax
  let plainText = text;
  plainText = plainText.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"); // Links
  plainText = plainText.replace(/\*\*([^*]+)\*\*/g, "$1"); // Bold
  plainText = plainText.replace(/__([^_]+)__/g, "$1"); // Bold
  plainText = plainText.replace(/\*([^*]+)\*/g, "$1"); // Italic
  plainText = plainText.replace(/_([^_]+)_/g, "$1"); // Italic
  plainText = plainText.replace(/`([^`]+)`/g, "$1"); // Inline code

  return {
    text: plainText,
    html: hasFormatting ? html : text,
    hasFormatting,
    hasLinks,
    hasBold,
  };
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Preview function to show what blocks will be created
 */
export function previewMarkdownBlocks(markdown: string): string[] {
  const result = parseMarkdownToBlocks(markdown);
  return result.blocks.map((block) => {
    switch (block.type) {
      case "text":
        const textBlock = block as TextBlock;
        return `${textBlock.element.toUpperCase()}: ${textBlock.content.substring(0, 50)}${textBlock.content.length > 50 ? "..." : ""}`;
      case "image":
        const imageBlock = block as ImageBlock;
        return `IMAGE: ${imageBlock.altText || "Untitled image"}`;
      case "divider":
        return "DIVIDER: Horizontal rule";
      case "list":
        const listBlock = block as ListBlock;
        return `LIST (${listBlock.style}): ${listBlock.items.length} items`;
      case "html":
        const htmlBlock = block as HTMLBlock;
        return `HTML: ${htmlBlock.description || "Custom content"}`;
      default:
        return `${block.type.toUpperCase()}: Content block`;
    }
  });
}
