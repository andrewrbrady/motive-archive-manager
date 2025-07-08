"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Edit, Trash2 } from "lucide-react";
import { IYoutubeChannel } from "@/models/youtube_channel";
import Link from "next/link";
import Image from "next/image";
import { useAPI } from "@/hooks/useAPI";

export default function YoutubeChannelList() {
  const [channels, setChannels] = useState<IYoutubeChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const api = useAPI();

  if (!api) return <div>Loading...</div>;

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const data = (await api.get("youtube/channels")) as IYoutubeChannel[];
        setChannels(data);
      } catch (error) {
        console.error("Error fetching channels:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [api]);

  const formatNumber = (num?: number) => {
    if (!num) return "0";
    return new Intl.NumberFormat().format(num);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-0">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="py-4">
              <Skeleton className="h-32 w-full rounded-md" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium mb-2">No channels added yet</h3>
        <p className="text-muted-foreground mb-6">
          Add your first YouTube channel to start curating content
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {channels.map((channel) => (
        <Card key={channel.channel_id} className="overflow-hidden">
          <div className="relative aspect-video w-full bg-muted flex items-center justify-center">
            {channel.thumbnail_url ? (
              <Image
                src={channel.thumbnail_url}
                alt={channel.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="text-muted-foreground">No thumbnail</div>
            )}
          </div>
          <CardHeader>
            <CardTitle className="text-lg">{channel.name}</CardTitle>
            <CardDescription>
              {formatNumber(channel.subscriber_count)} subscribers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
              {channel.description || "No description available"}
            </p>
            <div className="flex flex-wrap gap-2">
              {channel.tags?.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
              {channel.tags && channel.tags.length > 3 && (
                <Badge variant="outline">+{channel.tags.length - 3}</Badge>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`https://youtube.com/channel/${channel.channel_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Visit Channel
              </Link>
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon">
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
