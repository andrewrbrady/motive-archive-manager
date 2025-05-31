"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  FileText,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAPI } from "@/hooks/useAPI";

interface TranscriptSegment {
  start_time: number;
  end_time: number;
  text: string;
  speaker?: string;
}

interface TranscriptSpeaker {
  id: string;
  name: string;
}

interface TranscriptMetadata {
  duration: number;
  language: string;
  keywords: string[];
  sentiment?: string;
}

interface YoutubeTranscript {
  _id: string;
  video_id: string;
  language: string;
  is_auto_generated: boolean;
  full_text: string;
  segments: TranscriptSegment[];
  summary?: string;
  metadata: TranscriptMetadata;
  speakers?: TranscriptSpeaker[];
  created_at: string;
  updated_at: string;
}

interface YoutubeTranscriptPanelProps {
  videoId: string;
  videoTitle?: string;
}

export default function YoutubeTranscriptPanel({
  videoId,
  videoTitle,
}: YoutubeTranscriptPanelProps) {
  const [transcript, setTranscript] = useState<YoutubeTranscript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("full");
  const [requestingTranscript, setRequestingTranscript] = useState(false);
  const { toast } = useToast();
  const api = useAPI();

  if (!api) return <div>Loading...</div>;

  useEffect(() => {
    if (!videoId) return;

    const fetchTranscript = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = (await api.get(
          `youtube/transcripts?video_id=${videoId}`
        )) as YoutubeTranscript;
        setTranscript(data);
      } catch (err: any) {
        if (
          err.message?.includes("404") ||
          err.message?.includes("Not found")
        ) {
          setTranscript(null);
        } else {
          setError(
            err instanceof Error ? err.message : "An unknown error occurred"
          );
          console.error("Error fetching transcript:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTranscript();
  }, [videoId, api]);

  const requestTranscription = async () => {
    if (!videoId) return;

    setRequestingTranscript(true);

    try {
      await api.put("youtube/videos", {
        video_id: videoId,
        action: "transcribe",
      });

      toast({
        title: "Transcription requested",
        description:
          "The video will be transcribed in the background. This may take a few minutes.",
        variant: "default",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      console.error("Error requesting transcription:", err);

      toast({
        title: "Failed to request transcription",
        description:
          err instanceof Error ? err.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setRequestingTranscript(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const downloadTranscript = () => {
    if (!transcript) return;

    // Create a text file with the full transcript
    const element = document.createElement("a");
    const file = new Blob([transcript.full_text], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `transcript-${videoId}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <Skeleton className="h-6 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!transcript) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transcript
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No transcript available
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              This video doesn't have a transcript yet.
            </p>
            <Button
              onClick={requestTranscription}
              disabled={requestingTranscript}
            >
              {requestingTranscript ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Requesting...
                </>
              ) : (
                "Request Transcription"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transcript
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={transcript.is_auto_generated ? "outline" : "default"}
            >
              {transcript.is_auto_generated
                ? "Auto-generated"
                : "Human-verified"}
            </Badge>
            <Badge variant="outline">{transcript.language.toUpperCase()}</Badge>
            <Button variant="outline" size="sm" onClick={downloadTranscript}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="full"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="full">Full Transcript</TabsTrigger>
            <TabsTrigger value="segments">Segments</TabsTrigger>
            {transcript.summary && (
              <TabsTrigger value="summary">Summary</TabsTrigger>
            )}
            {transcript.metadata.keywords.length > 0 && (
              <TabsTrigger value="keywords">Keywords</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="full">
            <ScrollArea className="h-[400px] rounded-md border p-4">
              <p className="whitespace-pre-wrap">{transcript.full_text}</p>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="segments">
            <ScrollArea className="h-[400px] rounded-md border p-4">
              {transcript.segments.map((segment, index) => (
                <div key={index} className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {formatTime(segment.start_time)} -{" "}
                      {formatTime(segment.end_time)}
                    </Badge>
                    {segment.speaker && (
                      <Badge className="text-xs">{segment.speaker}</Badge>
                    )}
                  </div>
                  <p>{segment.text}</p>
                  {index < transcript.segments.length - 1 && (
                    <Separator className="mt-3" />
                  )}
                </div>
              ))}
            </ScrollArea>
          </TabsContent>

          {transcript.summary && (
            <TabsContent value="summary">
              <div className="rounded-md border p-4">
                <h3 className="text-lg font-semibold mb-2">Summary</h3>
                <p className="whitespace-pre-wrap">{transcript.summary}</p>
              </div>
            </TabsContent>
          )}

          {transcript.metadata.keywords.length > 0 && (
            <TabsContent value="keywords">
              <div className="rounded-md border p-4">
                <h3 className="text-lg font-semibold mb-2">Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {transcript.metadata.keywords.map((keyword, index) => (
                    <Badge key={index} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>

        <div className="mt-4 flex items-center text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4 mr-2" />
          Last updated: {new Date(transcript.updated_at).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}
