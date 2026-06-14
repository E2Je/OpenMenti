"use client";

import { QRCodeSVG } from "qrcode.react";
import { formatRoomCode, joinUrl } from "@/lib/utils";

/** QR + room code panel shown on the Instructions slide. */
export function JoinPanel({
  presentationId,
  roomCode,
}: {
  presentationId: string;
  roomCode: string;
}) {
  const url = joinUrl(presentationId);
  const host = url.replace(/^https?:\/\//, "").replace(/\/play\/.*$/, "");

  return (
    <div className="flex flex-wrap items-center justify-center gap-10">
      <div className="flex flex-col gap-3 text-center">
        <p className="text-xl text-ink-soft">היכנסו לכתובת</p>
        <p className="text-4xl font-extrabold text-ink" dir="ltr">
          {host}/play
        </p>
        <p className="mt-4 text-xl text-ink-soft">והזינו את הקוד</p>
        <p
          className="text-6xl font-black tracking-[0.15em] text-brand tabular-nums"
          dir="ltr"
        >
          {formatRoomCode(roomCode)}
        </p>
      </div>
      <div className="rounded-3xl bg-white p-5 shadow-[var(--shadow-lift)]">
        <QRCodeSVG value={url} size={220} level="M" includeMargin={false} />
        <p className="mt-3 text-center text-sm text-ink-faint">סרקו להצטרפות</p>
      </div>
    </div>
  );
}
