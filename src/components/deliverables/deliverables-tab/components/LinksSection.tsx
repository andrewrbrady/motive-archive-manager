import React from "react";
import { Link, Share2, Cloud } from "lucide-react";
import { Deliverable } from "@/types/deliverable";
import { isYouTubeUrl } from "../utils/youtube";

interface LinksSectionProps {
  deliverable: Deliverable;
}

export default function LinksSection({ deliverable }: LinksSectionProps) {
  // Don't render if no links are present
  if (
    !deliverable.dropbox_link &&
    !deliverable.social_media_link &&
    !deliverable.publishing_url
  ) {
    return null;
  }

  // InfoRow component for consistent display
  const InfoRow = ({
    icon: Icon,
    label,
    value,
    href,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | React.ReactNode;
    href?: string;
  }) => (
    <div className="flex items-center gap-3 py-1.5 border-b border-border/20 last:border-b-0">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 w-6" />
      <div className="text-sm font-medium text-foreground min-w-[120px] flex-shrink-0">
        {label}
      </div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:text-primary/80 break-all flex-1"
        >
          {value}
        </a>
      ) : (
        <div className="text-sm text-muted-foreground break-words flex-1">
          {value}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3 p-4 bg-transparent border border-border/30 rounded-lg">
      <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
        <Link className="h-4 w-4" />
        Links
      </h3>

      <div className="space-y-0">
        {deliverable.dropbox_link && (
          <InfoRow
            icon={Cloud}
            label="Dropbox"
            value="View in Dropbox"
            href={deliverable.dropbox_link}
          />
        )}

        {deliverable.social_media_link && (
          <InfoRow
            icon={Share2}
            label={
              isYouTubeUrl(deliverable.social_media_link)
                ? "YouTube"
                : "Social Media"
            }
            value={
              isYouTubeUrl(deliverable.social_media_link)
                ? "Watch on YouTube"
                : "View Post"
            }
            href={deliverable.social_media_link}
          />
        )}

        {deliverable.publishing_url && (
          <InfoRow
            icon={Link}
            label="Publishing URL"
            value="View Published Content"
            href={deliverable.publishing_url}
          />
        )}
      </div>
    </div>
  );
}
