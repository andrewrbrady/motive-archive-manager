"use client";

import { CardContent } from "@/components/ui/card";
import Navbar from "@/components/layout/navbar";
import ArticleGenerator from "@/app/copywriting/components/ArticleGenerator";
import EmailMarketing from "@/app/copywriting/components/EmailMarketing";
import { CustomTabs, TabItem } from "@/components/ui/custom-tabs";
import { AuthGuard } from "@/components/auth/AuthGuard";

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
  ];

  return (
    <AuthGuard>
      <Navbar />
      <div className="container mx-auto py-10">
        <CustomTabs
          items={tabItems}
          defaultValue="articles"
          basePath="/copywriting"
        />
      </div>
    </AuthGuard>
  );
}
