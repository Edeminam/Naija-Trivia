import { useState } from "react";
import { View } from "react-native";
import { REPORT_REASONS, type ReportReason } from "@ntc/shared";
import { BottomSheet, Chip, Button, Input, Txt, toast } from "../../ui";
import { sendOrQueue } from "../../lib/outbox";

/** Report a question from reveal or result screens. Works offline (queued). */
export function ReportSheet({ open, onClose, questionId, questionText, matchId }: { open: boolean; onClose: () => void; questionId: string | null; questionText?: string; matchId?: string }) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!questionId || !reason) return;
    setBusy(true);
    try {
      const r: any = await sendOrQueue("post", "/reports", { questionId, reason, note: note || undefined, matchId });
      toast.success(r?.queued ? "Report saved" : "Thanks for the report", r?.queued ? "We'll send it when you're back online." : "Our reviewers will take a look.");
      onClose();
      setReason(null);
      setNote("");
    } catch (e: any) {
      toast.error("Couldn't send report", e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Report question" subtitle={questionText}>
      <View className="flex-row flex-wrap gap-2">
        {REPORT_REASONS.map((r) => (
          <Chip key={r.id} label={r.label} selected={reason === r.id} onPress={() => setReason(r.id)} />
        ))}
      </View>
      <Input className="mt-4" placeholder="Anything else? (optional)" value={note} onChangeText={setNote} maxLength={300} multiline accessibilityLabel="Extra details" />
      <Txt variant="caption" tone="faint" className="mt-2">Questions with 5+ reports are paused automatically.</Txt>
      <Button label="Send report" full className="mt-4" disabled={!reason} loading={busy} onPress={submit} />
    </BottomSheet>
  );
}
