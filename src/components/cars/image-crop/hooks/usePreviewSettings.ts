import { useState, useEffect, useRef, useCallback } from "react";

export function usePreviewSettings() {
  const [livePreviewEnabled, setLivePreviewEnabled] = useState<boolean>(true);
  const [isGeneratingPreview, setIsGeneratingPreview] =
    useState<boolean>(false);
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);
  const [cachedImagePath, setCachedImagePath] = useState<string | null>(null);
  const [previewProcessingTime, setPreviewProcessingTime] = useState<
    number | null
  >(null);

  // Debounce timer for live preview
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load live preview preference from localStorage
  useEffect(() => {
    const savedLivePreview = localStorage.getItem("imageCropLivePreview");
    if (savedLivePreview !== null) {
      setLivePreviewEnabled(savedLivePreview === "true");
    }
  }, []);

  // Save live preview preference and handle toggle
  const handleLivePreviewToggle = useCallback((enabled: boolean) => {
    setLivePreviewEnabled(enabled);
    localStorage.setItem("imageCropLivePreview", enabled.toString());

    if (!enabled) {
      setLivePreviewUrl(null);
      setPreviewProcessingTime(null);
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    }
  }, []);

  const resetPreview = useCallback(() => {
    setLivePreviewUrl(null);
    setCachedImagePath(null);
    setPreviewProcessingTime(null);
    setIsGeneratingPreview(false);
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
  }, []);

  return {
    livePreviewEnabled,
    isGeneratingPreview,
    setIsGeneratingPreview,
    livePreviewUrl,
    setLivePreviewUrl,
    cachedImagePath,
    setCachedImagePath,
    previewProcessingTime,
    setPreviewProcessingTime,
    previewTimeoutRef,
    handleLivePreviewToggle,
    resetPreview,
  };
}
