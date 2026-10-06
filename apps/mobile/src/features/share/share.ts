import { Platform, Share } from "react-native";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { SERVER_URL } from "../../lib/config";
import { analytics } from "../../services/analytics";

/**
 * Share a branded 1080×1920 card rendered by the server (Satori → PNG), falling back to a text
 * share with a deep link if the image can't be fetched.
 */
async function shareCard(imagePath: string, link: string, message: string) {
  const imageUrl = `${SERVER_URL}${imagePath}`;
  try {
    if (Platform.OS === "web") {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new (globalThis as any).File([blob], "naija-trivia-clash.png", { type: "image/png" });
      const nav: any = globalThis.navigator;
      if (nav?.canShare?.({ files: [file] })) return await nav.share({ files: [file], text: `${message} ${link}` });
      if (nav?.share) return await nav.share({ text: message, url: link });
      window.open(imageUrl, "_blank");
      return;
    }
    const dest = new File(Paths.cache, `ntc-share-${Date.now()}.png`);
    const file = await File.downloadFileAsync(imageUrl, dest);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { mimeType: "image/png", dialogTitle: message, UTI: "public.png" });
      return;
    }
  } catch {
    /* fall back to a text share below */
  }
  await Share.share({ message: `${message} ${link}`, url: link });
}

export async function shareMatch(matchId: string, won: boolean) {
  analytics.track("share_match", { won });
  await shareCard(`/share/match/${matchId}.png`, `${SERVER_URL}/l/s/${matchId}`, won ? "I just won a Naija Trivia Clash 🇳🇬🔥 Think you can beat me?" : "Just played Naija Trivia Clash 🇳🇬 Come test your Naija knowledge!");
}

export async function shareChallengeCard(code: string, link: string) {
  analytics.track("share_challenge_card");
  await shareCard(`/share/challenge/${code}.png`, link, "I don challenge you for Naija Trivia Clash! 7 questions, same as mine. Oya!");
}
