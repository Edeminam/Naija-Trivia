/** Normalise a Nigerian mobile number to E.164 (+234…). Accepts 0803…, 803…, 234803…, +234803… */
export function toE164(input: string): string | null {
  const d = input.replace(/\D/g, "");
  let local = d;
  if (d.startsWith("234")) local = d.slice(3);
  else if (d.startsWith("0")) local = d.slice(1);
  if (!/^[789][01]\d{8}$/.test(local)) return null;
  return `+234${local}`;
}
