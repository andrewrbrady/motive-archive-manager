import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Youtube,
  Loader2,
  AlertCircle,
  ExternalLink,
  Play,
  ChevronDown,
  ChevronUp,
  Info,
  FileText,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Deliverable } from "@/types/deliverable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";

interface YouTubeUploadHelperProps {
  deliverable: Deliverable;
}

interface YouTubeAuthStatus {
  isAuthenticated: boolean;
  channels: Array<{
    id: string;
    title: string;
    subscriberCount?: string;
    videoCount?: string;
    customUrl?: string;
    description?: string;
  }>;
}

interface CarCaption {
  _id: string;
  carId: string;
  platform: string;
  context: string;
  caption: string;
  createdAt: string;
}

const YouTubeUploadHelper: React.FC<YouTubeUploadHelperProps> = ({
  deliverable,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [authStatus, setAuthStatus] = useState<YouTubeAuthStatus>({
    isAuthenticated: false,
    channels: [],
  });
  const [title, setTitle] = useState(
    deliverable.title || `${deliverable.title} - ${deliverable.type}`
  );
  const [description, setDescription] = useState(
    deliverable.description || `Video deliverable for ${deliverable.title}`
  );
  const [tags, setTags] = useState(
    deliverable.tags?.join(", ") || "automotive"
  );
  const [showUploadInfo, setShowUploadInfo] = useState(false);
  const [captions, setCaptions] = useState<CarCaption[]>([]);
  const [loadingCaptions, setLoadingCaptions] = useState(false);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string>("");
  const [useCustomDescription, setUseCustomDescription] = useState(true);
  const [editableCaption, setEditableCaption] = useState<string>("");

  // Check YouTube authentication status
  const checkAuthStatus = async () => {
    setIsCheckingAuth(true);
    try {
      const response = await fetch("/api/youtube/auth/status");
      const data = await response.json();
      setAuthStatus(data);
    } catch (error) {
      console.error("Error checking auth status:", error);
      setAuthStatus({ isAuthenticated: false, channels: [] });
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // Fetch captions for the car
  const fetchCaptions = async () => {
    if (!deliverable.car_id) {
      console.log("No car_id available for fetching captions");
      return;
    }

    setLoadingCaptions(true);
    try {
      const response = await fetch(`/api/cars/${deliverable.car_id}/captions`);
      if (!response.ok) {
        throw new Error("Failed to fetch captions");
      }
      const data = await response.json();
      setCaptions(data.captions || []);
    } catch (error) {
      console.error("Error fetching captions:", error);
      setCaptions([]);
    } finally {
      setLoadingCaptions(false);
    }
  };

  // Handle YouTube authentication
  const handleAuthenticate = async () => {
    try {
      // Store the current upload intent so we can resume after auth
      sessionStorage.setItem(
        "youtube_upload_deliverable_id",
        deliverable._id?.toString() || ""
      );
      sessionStorage.setItem("youtube_upload_title", title);
      sessionStorage.setItem("youtube_upload_description", description);
      sessionStorage.setItem("youtube_upload_tags", tags);

      // Show detailed user guidance before redirect
      toast(
        "🎯 IMPORTANT: To upload to the MotiveArchiveMedia channel:\n\n" +
          "1. On the next screen, you'll see 'Choose an account'\n" +
          "2. Look for the MotiveArchiveMedia Google account (NOT your personal account)\n" +
          "3. If you don't see it, click 'Use another account' and sign in with the brand account credentials\n" +
          "4. Make sure you're authenticating AS the brand account, not your personal account",
        {
          duration: 12000,
          style: {
            backgroundColor: "#dc2626",
            color: "white",
            fontSize: "14px",
            lineHeight: "1.4",
            whiteSpace: "pre-line",
            maxWidth: "500px",
          },
        }
      );

      // Get auth URL from API
      const response = await fetch("/api/youtube/auth/start");
      const data = await response.json();

      if (data.auth_url) {
        // Longer delay to let user read the detailed guidance
        setTimeout(() => {
          window.location.href = data.auth_url;
        }, 3000);
      } else {
        toast.error("Failed to start authentication");
      }
    } catch (error) {
      console.error("Authentication error:", error);
      toast.error("Failed to start authentication");
    }
  };

  // Resume upload after authentication (if coming back from auth)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("youtube_auth_success") === "true") {
      const storedDeliverableId = sessionStorage.getItem(
        "youtube_upload_deliverable_id"
      );
      if (storedDeliverableId === deliverable._id?.toString()) {
        // Restore form data
        const storedTitle = sessionStorage.getItem("youtube_upload_title");
        const storedDescription = sessionStorage.getItem(
          "youtube_upload_description"
        );
        const storedTags = sessionStorage.getItem("youtube_upload_tags");

        if (storedTitle) setTitle(storedTitle);
        if (storedDescription) setDescription(storedDescription);
        if (storedTags) setTags(storedTags);

        // Clear session storage
        sessionStorage.removeItem("youtube_upload_deliverable_id");
        sessionStorage.removeItem("youtube_upload_title");
        sessionStorage.removeItem("youtube_upload_description");
        sessionStorage.removeItem("youtube_upload_tags");

        // Open the upload dialog
        setIsOpen(true);

        // Clean URL
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [deliverable._id]);

  const handleUpload = async () => {
    if (!authStatus.isAuthenticated) {
      toast.error("Please authenticate with YouTube first");
      return;
    }

    setIsUploading(true);

    try {
      console.log("Starting YouTube upload for deliverable:", deliverable._id);
      console.log("Dropbox link:", deliverable.dropbox_link);

      const response = await fetch("/api/youtube/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deliverable_id: deliverable._id,
          title: title,
          description: getDescriptionForUpload(),
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          privacy_status: "private", // Default to private for user uploads
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401) {
          if (result.requires_auth || result.auth_url) {
            toast.error("YouTube authentication required");
            return;
          } else if (result.setup_required) {
            toast.error("YouTube setup required");
            return;
          }
        }

        // Handle other errors
        const errorMessage = result.details || result.error || "Upload failed";
        console.error("YouTube upload error:", errorMessage);

        // Handle specific "no YouTube channels" error
        if (errorMessage.includes("No YouTube channels found")) {
          toast.error(
            "You need to create a YouTube channel first. Visit youtube.com, sign in, and create a channel.",
            { duration: 6000 }
          );
          return;
        }

        throw new Error(errorMessage);
      }

      console.log("YouTube upload successful:", result);
      toast.success(
        `Video uploaded to YouTube successfully! ${result.youtube_url ? `\nVideo ID: ${result.video_id}` : ""}`
      );
      setIsOpen(false);

      // Refresh the page to show updated social media link
      window.location.reload();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload video"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleAuthorize = () => {
    // This method is no longer used in the new authentication flow
  };

  const handleClick = async () => {
    await checkAuthStatus();
    await fetchCaptions(); // Fetch captions when dialog opens

    if (!authStatus.isAuthenticated) {
      // Show auth prompt
      setIsOpen(true);
    } else {
      // Proceed with upload
      setIsOpen(true);
    }
  };

  // Get the description to use for upload
  const getDescriptionForUpload = (): string => {
    if (useCustomDescription) {
      return description;
    }

    return editableCaption || description;
  };

  // Format caption preview for dropdown
  const formatCaptionPreview = (caption: CarCaption): string => {
    const preview =
      caption.caption.length > 100
        ? caption.caption.substring(0, 100) + "..."
        : caption.caption;
    return `${caption.platform} - ${preview}`;
  };

  // Don't show button if no Dropbox link or not a video
  const isVideoType = [
    "Video",
    "Video Gallery",
    "feature",
    "promo",
    "review",
    "walkthrough",
    "highlights",
  ].includes(deliverable.type);

  if (!deliverable.dropbox_link || !isVideoType) {
    return null;
  }

  // Handle logout/clear authentication
  const handleLogout = async () => {
    try {
      // Clear session storage
      sessionStorage.removeItem("youtube_upload_deliverable_id");
      sessionStorage.removeItem("youtube_upload_title");
      sessionStorage.removeItem("youtube_upload_description");
      sessionStorage.removeItem("youtube_upload_tags");

      // Clear cookies by making a request to clear them server-side
      await fetch("/api/youtube/auth/logout", { method: "POST" });

      // Reset auth status
      setAuthStatus({ isAuthenticated: false, channels: [] });

      toast.success(
        "YouTube authentication cleared. You can now re-authenticate with the correct account."
      );
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to clear authentication");
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={isCheckingAuth}
        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-950"
        title="Upload to YouTube"
      >
        <Play className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload to YouTube</DialogTitle>
          </DialogHeader>

          {!authStatus.isAuthenticated ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-amber-600">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">YouTube authentication required</span>
              </div>

              <p className="text-sm text-muted-foreground">
                You need to authenticate with your YouTube account to upload
                videos. This will allow you to upload to your own YouTube
                channel.
              </p>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAuthenticate}>
                  Authenticate with YouTube
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Collapsible upload destination info */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                <button
                  onClick={() => setShowUploadInfo(!showUploadInfo)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Upload Destination Info
                    </span>
                  </div>
                  {showUploadInfo ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </button>
                {showUploadInfo && (
                  <div className="px-3 pb-3 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 mt-2 pt-3">
                    <div className="space-y-2">
                      <div>
                        Videos will be uploaded to the{" "}
                        <strong>first channel</strong> associated with your
                        authenticated Google account. If you're authenticated
                        with your personal account, uploads will go to your
                        personal channel even if you have access to brand
                        accounts.
                      </div>
                      <div className="text-xs bg-blue-50 dark:bg-blue-950 p-2 rounded border-l-2 border-blue-400">
                        <strong>To upload to MotiveArchiveMedia:</strong> Clear
                        your authentication below and re-authenticate directly
                        with the MotiveArchiveMedia Google account.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Check if we have the personal channel in the list - this indicates potential upload issues */}
              {authStatus.channels.length > 0 &&
                authStatus.channels.some(
                  (c) => c.id === "UCAy_HWd9o_G3PT_CBL0tV-Q"
                ) && (
                  <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800 dark:text-amber-200">
                      <div className="space-y-2">
                        <div className="font-medium">
                          ⚠️ Authentication Issue Detected
                        </div>
                        <div>
                          You're authenticated with your personal Google account
                          which includes access to your personal Andrew Brady
                          channel. While the system can detect the
                          MotiveArchiveMedia brand account, uploads may still go
                          to your personal channel due to YouTube's default
                          behavior. For best results, re-authenticate and
                          explicitly select only the MotiveArchiveMedia account
                          during sign-in.
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAuthenticate}
                          className="mt-2"
                        >
                          Re-authenticate with Brand Account Only
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

              {/* Always show logout option when authenticated */}
              {authStatus.isAuthenticated && (
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      Current Authentication Status
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      {authStatus.channels.length} channel(s) accessible
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
                  >
                    Clear & Re-authenticate
                  </Button>
                </div>
              )}

              <div className="space-y-4">
                <Label className="text-base font-medium">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter video title"
                  className="text-base"
                />
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">Description</Label>

                {/* Description mode selection */}
                <RadioGroup
                  value={useCustomDescription ? "custom" : "caption"}
                  onValueChange={(value) => {
                    const useCustom = value === "custom";
                    setUseCustomDescription(useCustom);
                    if (useCustom) {
                      setSelectedCaptionId("");
                      setEditableCaption("");
                    }
                  }}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="custom" />
                    <Label htmlFor="custom" className="cursor-pointer">
                      Custom Description
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="caption" id="caption" />
                    <Label htmlFor="caption" className="cursor-pointer">
                      Use Saved Caption
                    </Label>
                  </div>
                </RadioGroup>

                {/* Content based on selection */}
                {useCustomDescription ? (
                  <div className="space-y-2">
                    <Label
                      htmlFor="description"
                      className="text-sm text-muted-foreground"
                    >
                      Enter your custom video description
                    </Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Video description"
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        Select from existing captions for this car
                      </Label>
                      <Select
                        value={selectedCaptionId}
                        onValueChange={(value) => {
                          setSelectedCaptionId(value);
                          const selectedCaption = captions.find(
                            (c) => c._id === value
                          );
                          if (selectedCaption) {
                            setEditableCaption(selectedCaption.caption);
                          }
                        }}
                        disabled={loadingCaptions}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              loadingCaptions
                                ? "Loading captions..."
                                : captions.length === 0
                                  ? "No captions available for this car"
                                  : "Select a caption to use as description"
                            }
                          >
                            {selectedCaptionId && (
                              <span className="truncate">
                                {(() => {
                                  const selectedCaption = captions.find(
                                    (c) => c._id === selectedCaptionId
                                  );
                                  if (selectedCaption) {
                                    return selectedCaption.caption.length > 60
                                      ? selectedCaption.caption.substring(
                                          0,
                                          60
                                        ) + "..."
                                      : selectedCaption.caption;
                                  }
                                  return "";
                                })()}
                              </span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {captions.map((caption) => (
                            <SelectItem
                              key={caption._id}
                              value={caption._id}
                              className="py-3"
                            >
                              <div className="text-sm leading-relaxed break-words max-w-full">
                                {caption.caption.length > 120
                                  ? caption.caption.substring(0, 120) + "..."
                                  : caption.caption}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Selected caption editor */}
                    {selectedCaptionId && (
                      <div className="space-y-2">
                        <Label
                          htmlFor="editableCaption"
                          className="text-sm text-muted-foreground"
                        >
                          Edit selected caption (you can modify text, copy
                          title, etc.)
                        </Label>
                        <Textarea
                          id="editableCaption"
                          value={editableCaption}
                          onChange={(e) => setEditableCaption(e.target.value)}
                          rows={6}
                          className="resize-none bg-muted/50 border-muted"
                          placeholder="Caption content will appear here..."
                        />
                      </div>
                    )}

                    {captions.length === 0 && !loadingCaptions && (
                      <div className="p-4 text-center border-2 border-dashed border-muted rounded-lg">
                        <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-1">
                          No captions available
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Create captions for this car to use them as video
                          descriptions
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">Tags</Label>
                <div className="space-y-2">
                  <Label
                    htmlFor="tags"
                    className="text-sm text-muted-foreground"
                  >
                    Enter comma-separated tags for better video discoverability
                  </Label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="automotive, car, review, luxury"
                    className="text-base"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={
                    isUploading ||
                    authStatus.channels.length === 0 ||
                    (!useCustomDescription && !editableCaption.trim())
                  }
                  className="min-w-[140px]"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload to YouTube
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default YouTubeUploadHelper;
