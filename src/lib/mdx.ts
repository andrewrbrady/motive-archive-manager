export function parseFrontmatter(content: string = ""): {
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
