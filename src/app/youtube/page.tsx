import { Suspense } from "react";
import YoutubeContent from "@/components/youtube/YoutubeContent";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function YoutubePage() {
  return (
    <div className="space-y-8">
      <Suspense fallback={<LoadingSpinner />}>
        <YoutubeContent />
      </Suspense>
    </div>
  );
}
