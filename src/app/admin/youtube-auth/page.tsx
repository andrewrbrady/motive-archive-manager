import { Suspense } from "react";
import YouTubeAuthComponent from "@/components/admin/YouTubeAuthComponent";

export default function YouTubeAuthPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">
            YouTube API Authentication
          </h1>

          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">
                Setup YouTube Integration
              </h2>
              <p className="text-muted-foreground">
                This page allows team members to authenticate with YouTube to
                enable video uploads from the Motive Archive Manager.
              </p>
            </div>

            <Suspense fallback={<div>Loading...</div>}>
              <YouTubeAuthComponent />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
