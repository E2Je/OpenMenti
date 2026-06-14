import Link from "next/link";
import { Button } from "@/components/ui";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute -top-40 start-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-brand/20 blur-3xl" />
      <div className="relative z-10 flex max-w-2xl flex-col items-center gap-8 text-center">
        <span className="rounded-pill border border-border bg-surface/70 px-4 py-1.5 text-sm font-semibold text-brand backdrop-blur">
          itameter · ללא עלות · ללא הורדות
        </span>
        <h1 className="text-5xl font-black leading-tight text-ink md:text-6xl">
          מצגות אינטראקטיביות
          <br />
          <span className="text-brand">בזמן אמת</span>
        </h1>
        <p className="max-w-xl text-xl leading-relaxed text-ink-soft">
          הצבעות, ענני מילים, שאלות פתוחות ודירוג. עד 150 משתתפים מהנייד,
          בלי הורדות ובחינם לחלוטין.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/admin">
            <Button size="lg">פתיחת לוח הבקרה</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              התחברות
            </Button>
          </Link>
        </div>
        <p className="text-sm text-ink-faint">
          משתתפים? הצטרפו בכתובת{" "}
          <Link href="/play" className="font-semibold text-brand underline">
            /play
          </Link>{" "}
          עם הקוד מהמסך
        </p>
      </div>
    </main>
  );
}
