import type { Account } from "@prisma/client";
import { checkAgainstCreator, type PostSettings } from "@/lib/postSettings";
import { getValidAccessToken, queryCreatorInfo } from "@/lib/tiktok";

/** Validates settings against the account's live TikTok creator options. Returns an error message or null. */
export async function validateSettingsForAccount(account: Account, settings: PostSettings): Promise<string | null> {
  if (!account.openId) return "This account isn't connected via TikTok — reconnect it from the Accounts page.";
  try {
    const creator = await queryCreatorInfo(await getValidAccessToken(account));
    return checkAgainstCreator(settings, creator);
  } catch (err) {
    return err instanceof Error ? `Couldn't check your TikTok settings: ${err.message}` : "Couldn't reach TikTok";
  }
}
