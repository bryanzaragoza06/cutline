// JSON shapes returned by the API routes, as seen by client components
// (dates arrive as ISO strings).

export type PostStatus = "DRAFT" | "SCHEDULED" | "PARTIALLY_POSTED" | "POSTED" | "FAILED";
export type ScheduleStatus = "PENDING" | "PROCESSING" | "POSTED" | "FAILED";
export type VideoLayout = "PORTRAIT_9_16" | "LANDSCAPE_16_9";
export type VideoStyleKind = "AESTHETIC_SLIDESHOW" | "VIDEO_COMPILATION";
export type StartMode = "NOW" | "AT_TIME" | "COOK";

export type SafeAccount = {
  id: string;
  handle: string;
  displayName: string;
  avatarColor: string;
  openId: string | null;
  profileUrl: string | null;
  connectedAt: string;
  active: boolean;
  generating: boolean;
  lastPostedAt: string | null;
  lastError: string | null;
  startMode: StartMode;
  startTimeOfDay: string | null;
  activatedAt: string | null;
  repostIntervalMinutes: number | null;
  cycleLimit: number | null;
  breakMinutes: number | null;
  cyclePostCount: number;
  layout: VideoLayout;
  postingScheduleId: string | null;
  autoPrivacyLevel: string | null;
  autoAllowComment: boolean;
  autoAllowDuet: boolean;
  autoAllowStitch: boolean;
  autoBrandOrganic: boolean;
  autoBrandContent: boolean;
  autoConsentAt: string | null;
};

export type AccountWithStyles = SafeAccount & {
  styleLinks: { styleId: string; style: { id: string; name: string; kind: VideoStyleKind } }[];
  nextDueAt: string | null;
  postingSchedule: PostingSchedule | null;
  postedCount: number;
  lastPublishedAt: string | null;
};

export type Schedule = {
  id: string;
  postId: string;
  accountId: string;
  scheduledAt: string;
  status: ScheduleStatus;
  claimedAt: string | null;
  postedAt: string | null;
  error: string | null;
  publishId: string | null;
  title: string | null;
  privacyLevel: string | null;
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  brandOrganic: boolean;
  brandContent: boolean;
  account: SafeAccount;
};

export type Post = {
  id: string;
  bucketId: string;
  caption: string;
  title: string | null;
  mediaNote: string | null;
  videoUrl: string | null;
  durationSec: number | null;
  source: string;
  status: PostStatus;
  createdAt: string;
  schedules: Schedule[];
};


export type CreatorInfo = {
  creator_nickname: string;
  creator_username: string;
  creator_avatar_url: string;
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec: number;
};

export type StyleCounts = {
  images: number;
  videoClips: number;
  audioClips: number;
  captions: number;
  generatedVideos: number;
};

export type VideoStyleSummary = {
  id: string;
  name: string;
  description: string | null;
  kind: VideoStyleKind;
  defaultBucketId: string | null;
  secondsPerImage: number;
  crossfadeSec: number;
  titleOnScreen: boolean;
  titleAsCaption: boolean;
  createdAt: string;
  _count: StyleCounts;
};

export type StyleImage = { id: string; url: string; createdAt: string; libraryItemId: string | null };
export type StyleVideo = { id: string; url: string; durationSec: number; createdAt: string; libraryItemId: string | null };
export type StyleAudio = {
  id: string;
  url: string;
  filename: string;
  durationSec: number;
  postCaption: string | null;
  createdAt: string;
  libraryItemId: string | null;
  libraryItem: { id: string; clipStarts: string; durationSec: number | null } | null;
};
export type StyleCaption = { id: string; text: string; createdAt: string; libraryItemId: string | null };
export type GeneratedVideo = {
  id: string;
  status: "GENERATING" | "READY" | "FAILED";
  url: string | null;
  error: string | null;
  postId: string | null;
  createdAt: string;
  post: Omit<Post, "schedules"> | null;
};

export type VideoStyleDetail = Omit<VideoStyleSummary, "_count"> & {
  _count: { accountLinks: number };
  images: StyleImage[];
  videoClips: StyleVideo[];
  audioClips: StyleAudio[];
  captions: StyleCaption[];
  generatedVideos: GeneratedVideo[];
};

export type LibraryKind = "IMAGE" | "VIDEO" | "AUDIO" | "CAPTION";

export type LibraryItem = {
  id: string;
  kind: LibraryKind;
  url: string | null;
  filename: string | null;
  durationSec: number | null;
  text: string | null;
  createdAt: string;
  usedIn: number;
};

export type PostingSchedule = {
  id: string;
  name: string;
  repostIntervalMinutes: number | null;
  cycleLimit: number | null;
  breakMinutes: number | null;
  createdAt: string;
  _count?: { accounts: number };
};
