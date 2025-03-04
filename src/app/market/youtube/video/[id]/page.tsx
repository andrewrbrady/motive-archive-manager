import { Metadata } from "next";
import { notFound } from "next/navigation";
import YoutubeVideoDetail from "@/components/youtube/YoutubeVideoDetail";
import { dbConnect } from "@/lib/mongodb";
import { YoutubeVideo } from "@/models/youtube_video";
import { IYoutubeVideo } from "@/models/youtube_video";

interface PageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = params;

  try {
    await dbConnect();
    const video = (await YoutubeVideo.findOne({
      video_id: id,
    }).lean()) as IYoutubeVideo | null;

    if (!video) {
      return {
        title: "Video Not Found",
      };
    }

    return {
      title: `${video.title} | YouTube Archive`,
      description: video.description,
    };
  } catch (error) {
    console.error("Error fetching video metadata:", error);
    return {
      title: "YouTube Video",
    };
  }
}

export default async function YoutubeVideoPage({ params }: PageProps) {
  const { id } = params;

  try {
    await dbConnect();
    const video = (await YoutubeVideo.findOne({
      video_id: id,
    }).lean()) as IYoutubeVideo | null;

    if (!video) {
      notFound();
    }

    return (
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">YouTube Video</h1>
        <YoutubeVideoDetail videoId={id} />
      </div>
    );
  } catch (error) {
    console.error("Error fetching video:", error);
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Error</h1>
        <p className="text-red-500">Failed to load video details</p>
      </div>
    );
  }
}
