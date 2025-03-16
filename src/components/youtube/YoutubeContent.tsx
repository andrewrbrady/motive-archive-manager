"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CustomTabs } from "@/components/ui/custom-tabs";
import YoutubeChannelList from "./YoutubeChannelList";
import YoutubeVideoList from "./YoutubeVideoList";
import YoutubeCollectionList from "./YoutubeCollectionList";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import YoutubeAddChannelDialog from "./YoutubeAddChannelDialog";
import YoutubeAddVideoDialog from "./YoutubeAddVideoDialog";
import YoutubeAddCollectionDialog from "./YoutubeAddCollectionDialog";

export default function YoutubeContent() {
  const searchParams = useSearchParams();
  const youtubeTab = searchParams?.get("youtube_tab") || "channels";

  const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);
  const [isAddVideoOpen, setIsAddVideoOpen] = useState(false);
  const [isAddCollectionOpen, setIsAddCollectionOpen] = useState(false);

  const getAddButton = (tab: string) => {
    switch (tab) {
      case "channels":
        return (
          <Button
            onClick={() => setIsAddChannelOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Channel
          </Button>
        );
      case "videos":
        return (
          <Button
            onClick={() => setIsAddVideoOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Video
          </Button>
        );
      case "collections":
        return (
          <Button
            onClick={() => setIsAddCollectionOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Collection
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">YouTube Content</h2>
        {getAddButton(youtubeTab)}
      </div>

      <CustomTabs
        items={[
          {
            value: "channels",
            label: "Channels",
            content: <YoutubeChannelList />,
          },
          {
            value: "videos",
            label: "Videos",
            content: <YoutubeVideoList />,
          },
          {
            value: "collections",
            label: "Collections",
            content: <YoutubeCollectionList />,
          },
        ]}
        defaultValue="channels"
        paramName="youtube_tab"
        basePath="/market"
        className="w-full"
      />

      <YoutubeAddChannelDialog
        open={isAddChannelOpen}
        onOpenChange={setIsAddChannelOpen}
      />

      <YoutubeAddVideoDialog
        open={isAddVideoOpen}
        onOpenChange={setIsAddVideoOpen}
      />

      <YoutubeAddCollectionDialog
        open={isAddCollectionOpen}
        onOpenChange={setIsAddCollectionOpen}
      />
    </div>
  );
}
