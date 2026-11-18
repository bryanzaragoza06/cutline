// TikTok post settings, as explicitly chosen by the user. Shared by the
// "Post to TikTok now" screen, the scheduler and automated-post settings so
// all three enforce the same Content Sharing Guidelines rules.

// TikTok allows up to 2,200 characters in a video's title/caption.
export const TITLE_MAX = 2200;

export const PRIVACY_LEVELS = ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"] as const;

export type PostSettings = {
  title: string;
  privacyLevel: string;
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  brandOrganic: boolean;
  brandContent: boolean;
};

export type ParsedSettings = { ok: true; settings: PostSettings } | { ok: false; error: string };

/** Validates a request body coming from the post settings form. */
export function parsePostSettings(body: Record<string, unknown>): ParsedSettings {
  const title = typeof body.title === "string" ? body.title.trim().slice(0, TITLE_MAX) : "";
  const privacyLevel = typeof body.privacyLevel === "string" ? body.privacyLevel : "";
  const commercialDisclosure = body.commercialDisclosure === true;
  const yourBrand = body.yourBrand === true;
  const brandedContent = body.brandedContent === true;

  if (!privacyLevel || !(PRIVACY_LEVELS as readonly string[]).includes(privacyLevel)) {
    return { ok: false, error: "Choose who can see this post" };
  }
  if (commercialDisclosure && !yourBrand && !brandedContent) {
    return { ok: false, error: "You've turned on commercial content disclosure — check Your Brand, Branded Content, or both." };
  }
  if (commercialDisclosure && brandedContent && privacyLevel === "SELF_ONLY") {
    return { ok: false, error: "Branded content can't be posted privately — choose a different audience." };
  }

  return {
    ok: true,
    settings: {
      title,
      privacyLevel,
      allowComment: body.allowComment === true,
      allowDuet: body.allowDuet === true,
      allowStitch: body.allowStitch === true,
      brandOrganic: commercialDisclosure && yourBrand,
      brandContent: commercialDisclosure && brandedContent,
    },
  };
}

/** Checks the chosen settings against the creator's live TikTok options. */
export function checkAgainstCreator(
  settings: PostSettings,
  creator: { privacy_level_options: string[]; comment_disabled: boolean; duet_disabled: boolean; stitch_disabled: boolean },
): string | null {
  if (!creator.privacy_level_options.includes(settings.privacyLevel)) {
    return "That audience isn't available for this TikTok account — choose another.";
  }
  if (settings.allowComment && creator.comment_disabled) return "Comments are turned off for this TikTok account.";
  if (settings.allowDuet && creator.duet_disabled) return "Duets are turned off for this TikTok account.";
  if (settings.allowStitch && creator.stitch_disabled) return "Stitches are turned off for this TikTok account.";
  return null;
}
