"use client";

import { CardContent } from "@/components/ui/card";
import Navbar from "@/components/layout/navbar";
import ArticleGenerator from "@/app/copywriting/components/ArticleGenerator";
import EmailMarketing from "@/app/copywriting/components/EmailMarketing";
import { CustomTabs, TabItem } from "@/components/ui/custom-tabs";
import { AuthGuard } from "@/components/auth/AuthGuard";
import MDXTab from "@/components/copywriting/MDXTab";
import AdvancedMDXTab from "@/components/copywriting/AdvancedMDXTab";

export default function CopywritingPage() {
  // Define tab items
  const tabItems: TabItem[] = [
    {
      value: "articles",
      label: "Articles",
      content: <ArticleGenerator />,
    },
    {
      value: "email",
      label: "Email Marketing",
      content: <EmailMarketing />,
    },
    {
      value: "mdx",
      label: "MDX",
      content: <MDXTab />,
    },
    {
      value: "advanced-mdx",
      label: "Advanced MDX",
      content: <AdvancedMDXTab />,
    },
  ];

  return (
    <AuthGuard>
      <Navbar />
      <div className="container-wide mx-auto py-10 px-4 max-w-[90%] xl:max-w-[90%]">
        <CustomTabs
          items={tabItems}
          defaultValue="advanced-mdx"
          basePath="/copywriting"
        />
      </div>
    </AuthGuard>
  );
}
