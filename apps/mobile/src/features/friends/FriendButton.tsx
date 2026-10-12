import { UserPlus, UserCheck, Clock, Check } from "lucide-react-native";
import type { FriendStatus } from "@ntc/shared";
import { Button, toast } from "../../ui";
import { haptic } from "../../lib/haptics";
import { useFriendAction, useFriendStatus } from "./api";

/** Add-friend button that knows the current relationship (fetches it unless `status` is given). */
export function FriendButton({ id, name, status: given, size = "sm", full }: { id: string; name: string; status?: FriendStatus; size?: "sm" | "md"; full?: boolean }) {
  const q = useFriendStatus(given ? undefined : id);
  const act = useFriendAction();
  const status = given ?? q.data?.status;
  if (!status || status === "self") return null;
  const busy = act.isPending;
  const run = (action: "add" | "accept") =>
    act.mutate(
      { id, action },
      {
        onSuccess: (r) => {
          haptic.success();
          toast.success(r.status === "friends" ? `You and ${name} are now friends` : "Friend request sent", r.status === "friends" ? "Challenge them from your Friends list." : `${name} will get a notification.`);
        },
        onError: (e: any) => toast.error("Couldn't add friend", e.message),
      },
    );
  if (status === "friends") return <Button label="Friends" icon={UserCheck} size={size} variant="ghost" disabled full={full} />;
  if (status === "outgoing") return <Button label="Requested" icon={Clock} size={size} variant="ghost" disabled full={full} />;
  if (status === "incoming") return <Button label="Accept" icon={Check} size={size} loading={busy} onPress={() => run("accept")} full={full} />;
  return <Button label="Add friend" icon={UserPlus} size={size} variant="secondary" loading={busy} onPress={() => run("add")} full={full} />;
}
