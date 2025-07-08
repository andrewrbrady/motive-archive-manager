"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { PlusCircle, Edit, Trash2, Plus, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { BrandTone } from "@/app/api/admin/brand-tones/route";
import { useAPI } from "@/hooks/useAPI";

const BrandTonesContent: React.FC = () => {
  const [brandTones, setBrandTones] = useState<BrandTone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTone, setEditingTone] = useState<BrandTone | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tone_instructions: "",
    example_phrases: [] as string[],
    is_active: true,
  });

  const api = useAPI();

  useEffect(() => {
    if (api) {
      fetchBrandTones();
    }
  }, [api]);

  const fetchBrandTones = async () => {
    if (!api) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = (await api.get("/api/admin/brand-tones")) as BrandTone[];
      setBrandTones(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingTone(null);
    setFormData({
      name: "",
      description: "",
      tone_instructions: "",
      example_phrases: [],
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tone: BrandTone) => {
    setEditingTone(tone);
    setFormData({
      name: tone.name,
      description: tone.description,
      tone_instructions: tone.tone_instructions,
      example_phrases: [...tone.example_phrases],
      is_active: tone.is_active,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTone(null);
    setFormData({
      name: "",
      description: "",
      tone_instructions: "",
      example_phrases: [],
      is_active: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api) return;

    setIsSubmitting(true);

    try {
      const body = editingTone
        ? { id: editingTone._id, ...formData }
        : { ...formData };

      if (editingTone) {
        await api.put("/api/admin/brand-tones", body);
      } else {
        await api.post("/api/admin/brand-tones", body);
      }

      toast({
        title: "Success",
        description: `Brand tone ${editingTone ? "updated" : "created"} successfully`,
      });

      await fetchBrandTones();
      handleCloseModal();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (tone: BrandTone) => {
    if (!api || !confirm(`Are you sure you want to delete "${tone.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/api/admin/brand-tones?id=${tone._id}`);

      toast({
        title: "Success",
        description: "Brand tone deleted successfully",
      });

      await fetchBrandTones();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (tone: BrandTone) => {
    if (!api) return;

    try {
      await api.put("/api/admin/brand-tones", {
        id: tone._id,
        name: tone.name,
        description: tone.description,
        tone_instructions: tone.tone_instructions,
        example_phrases: tone.example_phrases,
        is_active: !tone.is_active,
      });

      await fetchBrandTones();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const addExamplePhrase = () => {
    if (formData.example_phrases.length < 10) {
      setFormData({
        ...formData,
        example_phrases: [...formData.example_phrases, ""],
      });
    }
  };

  const removeExamplePhrase = (index: number) => {
    setFormData({
      ...formData,
      example_phrases: formData.example_phrases.filter((_, i) => i !== index),
    });
  };

  const updateExamplePhrase = (index: number, value: string) => {
    const newPhrases = [...formData.example_phrases];
    newPhrases[index] = value;
    setFormData({
      ...formData,
      example_phrases: newPhrases,
    });
  };

  if (isLoading || !api) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>{!api ? "Authenticating..." : "Loading brand tones..."}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          <p className="font-semibold">Error loading brand tones</p>
          <p className="text-sm">{error}</p>
          <Button
            onClick={fetchBrandTones}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Brand Tone Settings</h2>
          <p className="text-muted-foreground">
            Manage brand tones that influence AI-generated content style and
            voice
          </p>
        </div>
        <Button onClick={handleOpenAddModal} disabled={isSubmitting}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Brand Tone
        </Button>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>All Brand Tones</CardTitle>
            <CardDescription>
              Configure different brand tones for consistent content voice
              across your copywriting
            </CardDescription>
          </CardHeader>
          <CardContent>
            {brandTones.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No brand tones found. Create your first brand tone to get
                started.
              </p>
            ) : (
              <div className="space-y-4">
                {brandTones.map((tone) => (
                  <div
                    key={tone._id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{tone.name}</h3>
                        {tone.is_active && (
                          <Badge variant="default">Active</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {tone.description}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        {tone.tone_instructions.length > 100
                          ? `${tone.tone_instructions.substring(0, 100)}...`
                          : tone.tone_instructions}
                      </p>
                      {tone.example_phrases.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tone.example_phrases
                            .slice(0, 3)
                            .map((phrase, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs"
                              >
                                "{phrase}"
                              </Badge>
                            ))}
                          {tone.example_phrases.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{tone.example_phrases.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={tone.is_active}
                        onCheckedChange={() => handleToggleActive(tone)}
                        disabled={isSubmitting}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditModal(tone)}
                        disabled={isSubmitting}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(tone)}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTone ? "Edit Brand Tone" : "Add Brand Tone"}
            </DialogTitle>
            <DialogDescription>
              {editingTone
                ? "Update the brand tone settings"
                : "Create a new brand tone to influence AI content generation"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Professional, Casual, Luxury, Performance"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of this brand tone"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tone_instructions">Tone Instructions</Label>
              <Textarea
                id="tone_instructions"
                value={formData.tone_instructions}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tone_instructions: e.target.value,
                  })
                }
                placeholder="Detailed instructions for the AI on how to write in this brand tone..."
                rows={6}
                className="font-mono text-sm"
                required
              />
              <p className="text-xs text-muted-foreground">
                These instructions will guide the AI on how to adapt the writing
                style and voice.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Example Phrases</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Add example phrases that exemplify this brand tone (optional,
                max 10)
              </p>
              <div className="space-y-2">
                {formData.example_phrases.map((phrase, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={phrase}
                      onChange={(e) =>
                        updateExamplePhrase(index, e.target.value)
                      }
                      placeholder={`Example phrase ${index + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExamplePhrase(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {formData.example_phrases.length < 10 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addExamplePhrase}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Example Phrase
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
              <Label htmlFor="is_active">Active</Label>
              <p className="text-xs text-muted-foreground">
                Active brand tones are available for selection in the copywriter
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? editingTone
                    ? "Updating..."
                    : "Creating..."
                  : editingTone
                    ? "Update Brand Tone"
                    : "Create Brand Tone"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrandTonesContent;
