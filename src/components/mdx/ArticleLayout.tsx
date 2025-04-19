import Image from "next/image";
import { cn } from "@/lib/utils";

interface ArticleLayoutProps {
  children: React.ReactNode;
  frontmatter: {
    title?: string;
    subtitle?: string;
    author?: string;
    tags?: string[];
    cover?: string;
    specs?: {
      [key: string]: string;
    };
  };
}

export default function ArticleLayout({
  children,
  frontmatter,
}: ArticleLayoutProps) {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">{children}</div>
  );
}
