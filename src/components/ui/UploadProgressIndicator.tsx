import React from "react";
import { Progress } from "@/components/ui/progress";
import { ImageProgress } from "@/lib/hooks/query/useImages";
import { Check, Cloud, AlertCircle, Brain, UploadCloud } from "lucide-react";

interface UploadProgressIndicatorProps {
  progress: ImageProgress;
}

export function UploadProgressIndicator({
  progress,
}: UploadProgressIndicatorProps) {
  const { status, fileName, currentStep, stepProgress } = progress;

  const getCloudflareIcon = () => {
    switch (stepProgress?.cloudflare.status) {
      case "complete":
        return <Check className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "uploading":
        return <UploadCloud className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <Cloud className="h-4 w-4 text-gray-500" />;
    }
  };

  const getOpenAIIcon = () => {
    switch (stepProgress?.openai.status) {
      case "complete":
        return <Check className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "analyzing":
        return <Brain className="h-4 w-4 text-purple-500 animate-pulse" />;
      default:
        return <Brain className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "complete":
        return "bg-green-100 text-green-800";
      case "error":
        return "bg-red-100 text-red-800";
      case "uploading":
        return "bg-blue-100 text-blue-800";
      case "processing":
      case "analyzing":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="mb-4 border rounded-md p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm truncate" title={fileName}>
          {fileName}
        </h4>
        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor()}`}>
          {status === "error"
            ? "Failed"
            : status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      {/* Overall progress */}
      <Progress value={progress.progress} className="h-2 mb-4" />

      {/* Detailed step progress */}
      <div className="grid grid-cols-1 gap-2 text-sm">
        {/* Cloudflare progress */}
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0">{getCloudflareIcon()}</div>
          <div className="flex-grow">
            <div className="flex justify-between items-center">
              <span className="font-medium text-xs">Cloudflare Upload</span>
              <span className="text-xs text-gray-500">
                {stepProgress?.cloudflare.progress}%
              </span>
            </div>
            <Progress
              value={stepProgress?.cloudflare.progress}
              className="h-1 mt-1"
            />
            <p className="text-xs text-gray-500 mt-0.5">
              {stepProgress?.cloudflare.message}
            </p>
          </div>
        </div>

        {/* OpenAI progress */}
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0">{getOpenAIIcon()}</div>
          <div className="flex-grow">
            <div className="flex justify-between items-center">
              <span className="font-medium text-xs">OpenAI Analysis</span>
              <span className="text-xs text-gray-500">
                {stepProgress?.openai.progress}%
              </span>
            </div>
            <Progress
              value={stepProgress?.openai.progress}
              className="h-1 mt-1"
            />
            <p className="text-xs text-gray-500 mt-0.5">
              {stepProgress?.openai.message}
            </p>
          </div>
        </div>
      </div>

      {progress.error && (
        <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          <span>{progress.error}</span>
        </div>
      )}
    </div>
  );
}

export function UploadProgressList({
  progresses,
}: {
  progresses: ImageProgress[];
}) {
  if (!progresses.length) return null;

  return (
    <div className="space-y-3 my-4">
      <h3 className="font-medium text-sm">
        Upload Progress ({progresses.length} files)
      </h3>
      {progresses.map((progress, index) => (
        <UploadProgressIndicator key={index} progress={progress} />
      ))}
    </div>
  );
}
