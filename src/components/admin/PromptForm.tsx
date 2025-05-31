"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useState,
  useMemo,
} from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ICaptionPrompt } from "../../app/admin/CaptionPromptsContent";
import { getIconComponent } from "@/components/ui/IconPicker";
import { useAPI } from "@/hooks/useAPI";

// Base type for form data
export type PromptFormData = {
  name: string;
  aiModel: string;
  platform: string;
  tone: string;
  style: string;
  length: string;
  prompt: string;
  isDefault?: boolean;
};

export interface PromptFormRef {
  submit: () => void;
}

interface PromptFormProps {
  prompt?: ICaptionPrompt; // For editing existing prompt
  onSubmit: (data: PromptFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  renderModelSelector?: () => React.ReactNode; // Custom model selector function
  externalAiModel?: string; // External AI model state for syncing
}

interface LengthSetting {
  key: string;
  name: string;
  description: string;
  instructions: string;
}

interface PlatformSetting {
  key: string;
  name: string;
  description: string;
  instructions: string;
  icon?: string;
}

// TypeScript interfaces for API responses
interface LengthSettingsResponse extends Array<LengthSetting> {}
interface PlatformSettingsResponse extends Array<PlatformSetting> {}

const PromptForm = forwardRef<PromptFormRef, PromptFormProps>(
  (
    {
      prompt,
      onSubmit,
      onCancel,
      isSubmitting,
      renderModelSelector,
      externalAiModel,
    },
    ref
  ) => {
    const api = useAPI();
    const [lengthSettings, setLengthSettings] = useState<LengthSetting[]>([
      {
        key: "concise",
        name: "Concise",
        description: "1-2 lines",
        instructions: "",
      },
      {
        key: "standard",
        name: "Standard",
        description: "2-3 lines",
        instructions: "",
      },
      {
        key: "detailed",
        name: "Detailed",
        description: "3-4 lines",
        instructions: "",
      },
      {
        key: "comprehensive",
        name: "Comprehensive",
        description: "4+ lines",
        instructions: "",
      },
    ]);

    const [platformSettings, setPlatformSettings] = useState<PlatformSetting[]>(
      []
    );

    // Create dynamic validation schema based on available settings
    const promptFormSchema = useMemo(() => {
      const platformKeys = platformSettings.map((s) => s.key);
      const lengthKeys = lengthSettings.map((s) => s.key);

      return z.object({
        name: z.string().min(3, "Name must be at least 3 characters"),
        aiModel: z.string().min(1, "AI Model is required"),
        platform: z.string().refine((val) => platformKeys.includes(val), {
          message: `Platform must be one of: ${platformKeys.join(", ")}`,
        }),
        tone: z.string().min(1, "Tone is required"),
        style: z.string().min(1, "Style is required"),
        length: z.string().refine((val) => lengthKeys.includes(val), {
          message: `Length must be one of: ${lengthKeys.join(", ")}`,
        }),
        prompt: z
          .string()
          .min(10, "Prompt text must be at least 10 characters"),
        isDefault: z.boolean().optional(),
      });
    }, [platformSettings, lengthSettings]);

    const {
      register,
      handleSubmit,
      control,
      setValue,
      watch,
      reset,
      formState: { errors },
    } = useForm<PromptFormData>({
      resolver: zodResolver(promptFormSchema),
      defaultValues: {
        name: prompt?.name || "",
        aiModel: prompt?.aiModel || "claude-3-5-sonnet-20241022",
        platform: prompt?.platform || platformSettings[0]?.key || "",
        tone: prompt?.tone || "professional",
        style: prompt?.style || "descriptive",
        length: prompt?.length || lengthSettings[0]?.key || "",
        prompt: prompt?.prompt || "",
        isDefault: prompt?.isDefault ?? false,
      },
    });

    // Reset form values when prompt prop changes
    useEffect(() => {
      if (prompt) {
        const resetData = {
          name: prompt.name || "",
          aiModel: prompt.aiModel || "claude-3-5-sonnet-20241022",
          platform: prompt.platform || platformSettings[0]?.key || "",
          tone: prompt.tone || "professional",
          style: prompt.style || "descriptive",
          length: prompt.length || lengthSettings[0]?.key || "",
          prompt: prompt.prompt || "",
          isDefault: prompt.isDefault ?? false,
        };
        reset(resetData);
      }
    }, [prompt, reset, platformSettings, lengthSettings]);

    useImperativeHandle(ref, () => ({
      submit: () => {
        handleSubmit(onSubmit)();
      },
    }));

    // Fetch length settings on component mount
    useEffect(() => {
      const fetchLengthSettings = async () => {
        if (!api) return;

        try {
          const settings = (await api.get(
            "length-settings"
          )) as LengthSettingsResponse;
          setLengthSettings(settings);
        } catch (error) {
          console.error("Error fetching length settings:", error);
          // Keep default settings on error
        }
      };

      fetchLengthSettings();
    }, [api]);

    // Fetch platform settings on component mount
    useEffect(() => {
      const fetchPlatformSettings = async () => {
        if (!api) return;

        try {
          const settings = (await api.get(
            "platform-settings"
          )) as PlatformSettingsResponse;
          setPlatformSettings(settings);
        } catch (error) {
          console.error("Error fetching platform settings:", error);
          // Keep default settings on error
        }
      };

      fetchPlatformSettings();
    }, [api]);

    // Update form values when settings are loaded to handle invalid existing values
    useEffect(() => {
      if (prompt && platformSettings.length > 0 && lengthSettings.length > 0) {
        const currentPlatform = watch("platform");
        const currentLength = watch("length");

        // Check if current platform is valid, if not set to first available
        if (!platformSettings.some((p) => p.key === currentPlatform)) {
          setValue("platform", platformSettings[0]?.key || "");
        }

        // Check if current length is valid, if not set to first available
        if (!lengthSettings.some((l) => l.key === currentLength)) {
          setValue("length", lengthSettings[0]?.key || "");
        }
      }
    }, [prompt, platformSettings, lengthSettings, setValue, watch]);

    useEffect(() => {
      if (renderModelSelector && externalAiModel) {
        setValue("aiModel", externalAiModel);
      }
    }, [renderModelSelector, externalAiModel, setValue]);

    return (
      <div className="w-full max-w-full overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* Basic Information Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
              <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                Basic Information
              </span>
              <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2.5 w-full">
                <div className="space-y-1.5 min-w-0">
                  <Label
                    htmlFor="name"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    Prompt Name
                  </Label>
                  <Input
                    id="name"
                    {...register("name")}
                    className="text-sm w-full"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Only show the aiModel input field if no custom selector is provided */}
                {!renderModelSelector && (
                  <div className="space-y-1.5 min-w-0">
                    <Label
                      htmlFor="aiModel"
                      className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                    >
                      AI Model
                    </Label>
                    <Input
                      id="aiModel"
                      {...register("aiModel")}
                      placeholder="e.g., claude-3-5-sonnet-20241022"
                      className="text-sm w-full"
                    />
                    {errors.aiModel && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.aiModel.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Render custom model selector if provided */}
          {renderModelSelector && (
            <div className="hidden">
              {/* Hidden input to satisfy form validation */}
              <input type="hidden" {...register("aiModel")} />
            </div>
          )}

          {/* Custom model selector will be rendered here */}
          {renderModelSelector && renderModelSelector()}

          {/* Platform & Settings Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
              <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                Platform & Settings
              </span>
              <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label
                  htmlFor="platform"
                  className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                >
                  Platform
                </Label>
                <Controller
                  name="platform"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={platformSettings.length === 0}
                    >
                      <SelectTrigger className="text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                        <SelectValue
                          placeholder={
                            platformSettings.length === 0
                              ? "Loading platforms..."
                              : "Select platform"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {platformSettings.length === 0 ? (
                          <SelectItem value="loading" disabled>
                            Loading platforms...
                          </SelectItem>
                        ) : (
                          platformSettings.map((setting) => {
                            const IconComponent = setting.icon
                              ? getIconComponent(setting.icon)
                              : null;
                            return (
                              <SelectItem key={setting.key} value={setting.key}>
                                <div className="flex items-center gap-2">
                                  {IconComponent && (
                                    <IconComponent className="h-4 w-4" />
                                  )}
                                  <span>
                                    {setting.name} ({setting.description})
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.platform && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.platform.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="tone"
                  className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                >
                  Tone
                </Label>
                <Controller
                  name="tone"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger className="text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">
                          Professional
                        </SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="enthusiastic">
                          Enthusiastic
                        </SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.tone && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.tone.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="style"
                  className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                >
                  Style
                </Label>
                <Controller
                  name="style"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger className="text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                        <SelectValue placeholder="Select style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="descriptive">Descriptive</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                        <SelectItem value="storytelling">
                          Storytelling
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.style && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.style.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="length"
                  className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                >
                  Length
                </Label>
                <Controller
                  name="length"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger className="text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                        <SelectValue placeholder="Select length" />
                      </SelectTrigger>
                      <SelectContent>
                        {lengthSettings.map((setting) => {
                          return (
                            <SelectItem key={setting.key} value={setting.key}>
                              {setting.name} ({setting.description})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.length && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.length.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Prompt Content Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
              <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                Prompt Content
              </span>
              <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
            </div>

            <div className="space-y-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor="prompt"
                  className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                >
                  Prompt Text
                </Label>
                <Textarea
                  id="prompt"
                  {...register("prompt")}
                  rows={10}
                  placeholder="Enter the full prompt text here..."
                  className="text-sm resize-none"
                />
                {errors.prompt && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.prompt.message}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Controller
                  name="isDefault"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="isDefault"
                      checked={Boolean(field.value)}
                      onCheckedChange={(value) =>
                        field.onChange(Boolean(value))
                      }
                    />
                  )}
                />
                <Label htmlFor="isDefault" className="text-sm font-normal">
                  Set as default prompt for its platform
                </Label>
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }
);

PromptForm.displayName = "PromptForm";

export default PromptForm;
