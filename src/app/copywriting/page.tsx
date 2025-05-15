import { Metadata } from "next";
import { PageTitle } from "@/components/ui/PageTitle";
import { CustomTabs } from "@/components/ui/custom-tabs";
import ArticleGenerator from "@/app/copywriting/components/ArticleGenerator";
import EmailMarketing from "@/app/copywriting/components/EmailMarketing";
import MDXTab from "@/components/copywriting/MDXTab";
import AdvancedMDXTab from "@/components/copywriting/AdvancedMDXTab";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
  title: "Copywriting | Motive Archive",
  description: "Content creation and copywriting tools",
};

export default function CopywritingPage() {
  return (
    <AuthGuard>
      <div className="space-y-6">
        <PageTitle title="Copywriting" />
        <CustomTabs
          items={[
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
          ]}
          defaultValue="articles"
          basePath="/copywriting"
        />
      </div>
    </AuthGuard>
  );
}
