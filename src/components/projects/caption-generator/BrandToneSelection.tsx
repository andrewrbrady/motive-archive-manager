"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { BrandTone } from "@/hooks/useBrandTones";

interface BrandToneSelectionProps {
  brandTones: BrandTone[];
  selectedBrandToneId: string;
  loadingBrandTones: boolean;
  brandToneError: string | null;
  onBrandToneChange: (brandToneId: string) => void;
}

export function BrandToneSelection({
  brandTones,
  selectedBrandToneId,
  loadingBrandTones,
  brandToneError,
  onBrandToneChange,
}: BrandToneSelectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Brand Tone</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loadingBrandTones ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              Loading brand tones...
            </span>
          </div>
        ) : brandToneError ? (
          <div className="text-sm text-destructive">
            Error loading brand tones: {brandToneError}
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="brand-tone-select">Select Brand Tone</Label>
            <Select
              value={selectedBrandToneId}
              onValueChange={onBrandToneChange}
            >
              <SelectTrigger id="brand-tone-select">
                <SelectValue placeholder="Choose a brand tone (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  <div className="flex flex-col">
                    <span className="font-medium">Default</span>
                    <span className="text-xs text-muted-foreground">
                      No specific brand tone
                    </span>
                  </div>
                </SelectItem>
                {brandTones
                  .filter((tone): tone is BrandTone & { _id: string } =>
                    Boolean(tone._id && tone._id.trim() !== "")
                  )
                  .map((tone) => (
                    <SelectItem key={tone._id} value={tone._id}>
                      <div className="flex flex-col w-full">
                        <span className="font-medium">{tone.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {tone.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {selectedBrandToneId && selectedBrandToneId !== "default" && (
              <div className="text-xs text-muted-foreground">
                {(() => {
                  const selectedTone = brandTones.find(
                    (tone) => tone._id === selectedBrandToneId
                  );
                  if (selectedTone) {
                    return (
                      <div className="space-y-1">
                        <div className="font-medium">Instructions:</div>
                        <div className="text-xs">
                          {selectedTone.tone_instructions.length > 150
                            ? `${selectedTone.tone_instructions.substring(0, 150)}...`
                            : selectedTone.tone_instructions}
                        </div>
                        {selectedTone.example_phrases.length > 0 && (
                          <div className="space-y-1">
                            <div className="font-medium">Example phrases:</div>
                            <div className="text-xs">
                              {selectedTone.example_phrases
                                .slice(0, 3)
                                .join(", ")}
                              {selectedTone.example_phrases.length > 3 && "..."}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
