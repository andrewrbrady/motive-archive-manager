import { Compass, Eye, Sun, Move } from "lucide-react";

interface ImageMetadataProps {
  metadata: {
    angle?: string;
    view?: string;
    tod?: string;
    movement?: string;
    description?: string;
  };
}

export function ImageMetadata({ metadata }: ImageMetadataProps) {
  return (
    <div className="bg-white dark:bg-[#111111] rounded-lg shadow p-3">
      <div className="grid grid-cols-4 divide-x divide-gray-200 dark:divide-gray-800">
        <div className="flex items-center px-4 first:pl-0 last:pr-0">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400 uppercase text-xs font-medium">
              Angle
            </span>
          </div>
          <span className="uppercase text-xs ml-auto text-gray-700 dark:text-gray-300">
            {metadata.angle || "N/A"}
          </span>
        </div>
        <div className="flex items-center px-4 first:pl-0 last:pr-0">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400 uppercase text-xs font-medium">
              View
            </span>
          </div>
          <span className="uppercase text-xs ml-auto text-gray-700 dark:text-gray-300">
            {metadata.view || "N/A"}
          </span>
        </div>
        <div className="flex items-center px-4 first:pl-0 last:pr-0">
          <div className="flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400 uppercase text-xs font-medium">
              Time of Day
            </span>
          </div>
          <span className="uppercase text-xs ml-auto text-gray-700 dark:text-gray-300">
            {metadata.tod || "N/A"}
          </span>
        </div>
        <div className="flex items-center px-4 first:pl-0 last:pr-0">
          <div className="flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400 uppercase text-xs font-medium">
              Movement
            </span>
          </div>
          <span className="uppercase text-xs ml-auto text-gray-700 dark:text-gray-300">
            {metadata.movement || "N/A"}
          </span>
        </div>
      </div>
      {metadata.description && (
        <div className="mt-2 text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-gray-800 pt-2">
          {metadata.description}
        </div>
      )}
    </div>
  );
}
