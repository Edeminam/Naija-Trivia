import { View, Linking } from "react-native";
import * as Clipboard from "expo-clipboard";
import { MessageCircle, Link2, Image as ImageIcon } from "lucide-react-native";
import type { ChallengeSummary } from "@ntc/shared";
import { Button, toast } from "../../ui";
import { shareChallengeCard } from "../share/share";
import { analytics } from "../../services/analytics";

export function ShareActions({ c }: { c: ChallengeSummary }) {
  return (
    <View className="gap-3">
      <Button
        label="Send on WhatsApp"
        icon={MessageCircle}
        size="lg"
        full
        onPress={async () => {
          analytics.track("challenge_shared", { channel: "whatsapp" });
          await Linking.openURL(c.whatsappUrl).catch(() => toast.error("WhatsApp isn't available", "Copy the link instead."));
        }}
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button
            label="Copy link"
            icon={Link2}
            variant="secondary"
            full
            onPress={async () => {
              await Clipboard.setStringAsync(c.shareUrl);
              toast.success("Link copied", c.shareUrl);
            }}
          />
        </View>
        <View className="flex-1">
          <Button label="Share card" icon={ImageIcon} variant="secondary" full onPress={() => shareChallengeCard(c.code, c.shareUrl).catch(() => {})} />
        </View>
      </View>
    </View>
  );
}
