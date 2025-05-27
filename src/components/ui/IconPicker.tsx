import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";

// Import icons by category
import {
  // Social Media & Platforms
  Instagram,
  Youtube,
  Twitter,
  Facebook,
  Linkedin,
  MessageCircle,
  Share2,
  Hash,
  AtSign,

  // Video & Photo
  Video,
  Camera,
  Image,
  Film,
  Play,
  Pause,
  Circle,
  Clapperboard,
  Aperture,
  Focus,

  // Writing & Content
  PenTool,
  Edit,
  FileText,
  Type,
  AlignLeft,
  BookOpen,
  Newspaper,
  Quote,
  MessageSquare,

  // Marketing & Business
  TrendingUp,
  Target,
  Megaphone,
  BarChart,
  PieChart,
  Users,
  UserPlus,
  Heart,
  ThumbsUp,
  Star,

  // Communication
  Mail,
  Send,
  Phone,
  MessageCircle as Chat,
  Mic,
  Volume2,
  Headphones,
  Radio,

  // General
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Tv,
  Rss,
  Wifi,
  Link,
  Eye,
} from "lucide-react";

// Define icon categories
const iconCategories = {
  social: {
    name: "Social Media",
    icons: [
      { name: "Instagram", component: Instagram },
      { name: "Youtube", component: Youtube },
      { name: "Twitter", component: Twitter },
      { name: "Facebook", component: Facebook },
      { name: "Linkedin", component: Linkedin },
      { name: "MessageCircle", component: MessageCircle },
      { name: "Share2", component: Share2 },
      { name: "Hash", component: Hash },
      { name: "AtSign", component: AtSign },
    ],
  },
  video: {
    name: "Video & Photo",
    icons: [
      { name: "Video", component: Video },
      { name: "Camera", component: Camera },
      { name: "Image", component: Image },
      { name: "Film", component: Film },
      { name: "Play", component: Play },
      { name: "Pause", component: Pause },
      { name: "Circle", component: Circle },
      { name: "Clapperboard", component: Clapperboard },
      { name: "Aperture", component: Aperture },
      { name: "Focus", component: Focus },
    ],
  },
  writing: {
    name: "Writing & Content",
    icons: [
      { name: "PenTool", component: PenTool },
      { name: "Edit", component: Edit },
      { name: "FileText", component: FileText },
      { name: "Type", component: Type },
      { name: "AlignLeft", component: AlignLeft },
      { name: "BookOpen", component: BookOpen },
      { name: "Newspaper", component: Newspaper },
      { name: "Quote", component: Quote },
      { name: "MessageSquare", component: MessageSquare },
    ],
  },
  marketing: {
    name: "Marketing & Business",
    icons: [
      { name: "TrendingUp", component: TrendingUp },
      { name: "Target", component: Target },
      { name: "Megaphone", component: Megaphone },
      { name: "BarChart", component: BarChart },
      { name: "PieChart", component: PieChart },
      { name: "Users", component: Users },
      { name: "UserPlus", component: UserPlus },
      { name: "Heart", component: Heart },
      { name: "ThumbsUp", component: ThumbsUp },
      { name: "Star", component: Star },
    ],
  },
  communication: {
    name: "Communication",
    icons: [
      { name: "Mail", component: Mail },
      { name: "Send", component: Send },
      { name: "Phone", component: Phone },
      { name: "Chat", component: Chat },
      { name: "Mic", component: Mic },
      { name: "Volume2", component: Volume2 },
      { name: "Headphones", component: Headphones },
      { name: "Radio", component: Radio },
    ],
  },
  general: {
    name: "General",
    icons: [
      { name: "Globe", component: Globe },
      { name: "Monitor", component: Monitor },
      { name: "Smartphone", component: Smartphone },
      { name: "Tablet", component: Tablet },
      { name: "Laptop", component: Laptop },
      { name: "Tv", component: Tv },
      { name: "Rss", component: Rss },
      { name: "Wifi", component: Wifi },
      { name: "Link", component: Link },
      { name: "Eye", component: Eye },
    ],
  },
} as const;

// Get icon component by name
export const getIconComponent = (iconName: string) => {
  // First, try direct icon name lookup
  for (const category of Object.values(iconCategories)) {
    const icon = category.icons.find((icon) => icon.name === iconName);
    if (icon) return icon.component;
  }

  // If not found, try platform key to icon name mapping
  const platformIconMap: Record<string, string> = {
    instagram: "Instagram",
    youtube: "Youtube",
    twitter: "Twitter",
    facebook: "Facebook",
    threads: "MessageCircle",
    email: "Mail",
    linkedin: "Linkedin",
    tiktok: "Video",
    snapchat: "Camera",
    pinterest: "Image",
    reddit: "MessageSquare",
    discord: "Chat",
    whatsapp: "MessageCircle",
    telegram: "Send",
    blog: "FileText",
    website: "Globe",
    newsletter: "Mail",
    podcast: "Mic",
  };

  const mappedIconName = platformIconMap[iconName.toLowerCase()];
  if (mappedIconName) {
    for (const category of Object.values(iconCategories)) {
      const icon = category.icons.find((icon) => icon.name === mappedIconName);
      if (icon) return icon.component;
    }
  }

  return null;
};

interface IconPickerProps {
  selectedIcon?: string;
  onIconSelect: (iconName: string) => void;
  placeholder?: string;
}

export function IconPicker({
  selectedIcon,
  onIconSelect,
  placeholder = "Select an icon",
}: IconPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Filter icons based on search term
  const filteredCategories = Object.entries(iconCategories).reduce(
    (acc, [key, category]) => {
      const filteredIcons = category.icons.filter((icon) =>
        icon.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filteredIcons.length > 0) {
        (acc as any)[key] = { ...category, icons: filteredIcons };
      }
      return acc;
    },
    {} as Partial<typeof iconCategories>
  );

  const SelectedIconComponent = selectedIcon
    ? getIconComponent(selectedIcon)
    : null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
        >
          {SelectedIconComponent ? (
            <div className="flex items-center gap-2">
              <SelectedIconComponent className="h-4 w-4" />
              <span>{selectedIcon}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search icons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Tabs defaultValue="social" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1">
            <TabsTrigger value="social" className="text-xs">
              Social
            </TabsTrigger>
            <TabsTrigger value="video" className="text-xs">
              Video
            </TabsTrigger>
            <TabsTrigger value="writing" className="text-xs">
              Writing
            </TabsTrigger>
          </TabsList>
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 mt-1">
            <TabsTrigger value="marketing" className="text-xs">
              Marketing
            </TabsTrigger>
            <TabsTrigger value="communication" className="text-xs">
              Comm
            </TabsTrigger>
            <TabsTrigger value="general" className="text-xs">
              General
            </TabsTrigger>
          </TabsList>

          {Object.entries(filteredCategories).map(([key, category]) => (
            <TabsContent
              key={key}
              value={key}
              className="p-4 max-h-64 overflow-y-auto"
            >
              <div className="grid grid-cols-6 gap-2">
                {category?.icons.map((icon) => {
                  const IconComponent = icon.component;
                  const isSelected = selectedIcon === icon.name;

                  return (
                    <Button
                      key={icon.name}
                      variant={isSelected ? "default" : "ghost"}
                      size="sm"
                      className="h-10 w-10 p-0"
                      onClick={() => {
                        onIconSelect(icon.name);
                        setIsOpen(false);
                      }}
                      title={icon.name}
                    >
                      <IconComponent className="h-4 w-4" />
                    </Button>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
