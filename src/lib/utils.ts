/** Tiny className joiner (no clsx dependency). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** 8-digit room code, grouped as "1234 5678" for display. */
export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) code += Math.floor(Math.random() * 10);
  return code;
}

export function formatRoomCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}` : code;
}

/** Absolute participant join URL for QR codes. */
export function joinUrl(presentationId: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/play/${presentationId}`;
}
