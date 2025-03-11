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
import { Edit, Trash2, Play } from "lucide-react";
import { IYoutubeCollection } from "@/models/youtube_collection";
import Image from "next/image";

export default function YoutubeCollectionList() {
  const [collections, setCollections] = useState<IYoutubeCollection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await fetch("/api/youtube/collections");
        if (!response.ok) {
          throw new Error("Failed to fetch collections");
        }
        const data = await response.json();
        setCollections(data);
      } catch (error) {
        console.error("Error fetching collections:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, []);

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

  if (collections.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium mb-2">No collections added yet</h3>
        <p className="text-muted-foreground mb-6">
          Add your first YouTube collection to start organizing content
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {collections.map((collection, index) => (
        <Card key={index} className="overflow-hidden">
          <div className="relative aspect-video w-full bg-muted flex items-center justify-center">
            {collection.thumbnail_url ? (
              <Image
                src={collection.thumbnail_url}
                alt={collection.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="text-muted-foreground">No thumbnail</div>
            )}
            {collection.is_featured && (
              <div className="absolute top-2 left-2">
                <Badge>Featured</Badge>
              </div>
            )}
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {collection.video_ids.length} videos
            </div>
          </div>
          <CardHeader>
            <CardTitle className="text-lg">{collection.name}</CardTitle>
            <CardDescription>
              Created on {new Date(collection.created_at).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
              {collection.description || "No description available"}
            </p>
            <div className="flex flex-wrap gap-2">
              {collection.tags?.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
              {collection.tags && collection.tags.length > 3 && (
                <Badge variant="outline">+{collection.tags.length - 3}</Badge>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              View Collection
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
