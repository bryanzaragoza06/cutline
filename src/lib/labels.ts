import type { VideoLayout, VideoStyleKind } from "@/lib/types";

export const KIND_LABELS: Record<VideoStyleKind, string> = {
  AESTHETIC_SLIDESHOW: "Image Slideshow",
  VIDEO_COMPILATION: "Video Compilation",
};

export const LAYOUT_LABELS: Record<VideoLayout, string> = {
  LANDSCAPE_16_9: "16:9 landscape",
  PORTRAIT_9_16: "9:16 portrait",
};

export const PRIVACY_LABELS: Record<string, string> = {
  PUBLIC_TO_EVERYONE: "Everyone",
  MUTUAL_FOLLOW_FRIENDS: "Friends",
  FOLLOWER_OF_CREATOR: "Followers",
  SELF_ONLY: "Only me",
};
