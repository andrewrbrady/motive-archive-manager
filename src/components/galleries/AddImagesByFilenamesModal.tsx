"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "@/components/ui/use-toast";
import { Loader2, ListPlus } from "lucide-react";

interface AddImagesByFilenamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  galleryId: string;
  onImagesAdded?: (addedCount: number) => void;
}

interface ImageDocMinimal {
  _id: string;
  filename?: string;
}

export function AddImagesByFilenamesModal({
  isOpen,
  onClose,
  galleryId,
  onImagesAdded,
}: AddImagesByFilenamesModalProps) {
  const api = useAPI();
  const [input, setInput] = useState<string>("");
  const [addAllMatches, setAddAllMatches] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [results, setResults] = useState<
    { query: string; matches: ImageDocMinimal[] }[]
  >([]);

  const filenames = useMemo(() => {
    return input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }, [input]);

  const canSubmit = useMemo(() => {
    return !!api && filenames.length > 0 && !isProcessing;
  }, [api, filenames.length, isProcessing]);

  const handleAdd = useCallback(async () => {
    if (!api) return;
    const queries = filenames;
    if (queries.length === 0) {
      toast({
        title: "No filenames",
        description: "Paste one or more filenames.",
      });
      return;
    }

    try {
      setIsProcessing(true);
      const aggregatedResults: { query: string; matches: ImageDocMinimal[] }[] =
        [];

      for (const query of queries) {
        const limit = addAllMatches ? 50 : 1;
        const url = `/images?search=${encodeURIComponent(query)}&limit=${limit}`;
        const res = await api.get<{ images: ImageDocMinimal[] }>(url);
        const filtered = (res?.images || []).filter((img) =>
          (img.filename || "").toLowerCase().includes(query.toLowerCase())
        );
        aggregatedResults.push({ query, matches: filtered });
      }

      setResults(aggregatedResults);

      const imageIds: string[] = [];
      for (const item of aggregatedResults) {
        if (!item.matches || item.matches.length === 0) continue;
        if (addAllMatches) {
          item.matches.forEach((img) => imageIds.push(img._id));
        } else {
          imageIds.push(item.matches[0]._id);
        }
      }

      const uniqueImageIds = Array.from(new Set(imageIds));

      if (uniqueImageIds.length === 0) {
        toast({
          title: "No matches found",
          description: "None of the pasted filenames matched images.",
        });
        setIsProcessing(false);
        return;
      }

      await api.patch(`/galleries/${galleryId}/add-images`, {
        imageIds: uniqueImageIds,
      });

      const matchedQueries = aggregatedResults.filter(
        (r) => r.matches.length > 0
      ).length;
      toast({
        title: "Images added",
        description: `Added ${uniqueImageIds.length} image(s) from ${matchedQueries}/${queries.length} filename(s).`,
      });

      onImagesAdded?.(uniqueImageIds.length);
      setIsProcessing(false);
      setInput("");
      setResults([] as any);
      onClose();
    } catch (err) {
      console.error("Error adding images by filenames:", err);
      toast({
        title: "Failed to add images",
        description: "An error occurred while searching or adding images.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  }, [api, filenames, addAllMatches, galleryId, onImagesAdded]);

  return (
    <Dialog open={isOpen} onOpenChange={() => !isProcessing && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="h-5 w-5" />
            Add Images by Filenames
          </DialogTitle>
          <DialogDescription>
            Paste one filename per line. Blank lines are ignored. We will search
            the image library by filename and add matches to this gallery.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="filenames">Filenames</Label>
            <Textarea
              id="filenames"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`example1.jpg\nIMG_1234.JPG\nmy-photo`}
              className="min-h-[180px]"
              disabled={isProcessing}
            />
            <div className="text-xs text-muted-foreground">
              {filenames.length} filename{filenames.length === 1 ? "" : "s"}{" "}
              detected
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="addAll"
                checked={addAllMatches}
                onCheckedChange={setAddAllMatches}
                disabled={isProcessing}
              />
              <Label htmlFor="addAll">Add all matches (not just first)</Label>
            </div>
          </div>

          {results.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Found matches for{" "}
              {results.filter((r) => r.matches.length > 0).length}/
              {results.length} filename(s)
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!canSubmit}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              "Find & Add"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
