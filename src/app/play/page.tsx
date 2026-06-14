import { JoinForm } from "./JoinForm";

// Reads live session state at request time - keep it out of static prerender.
export const dynamic = "force-dynamic";

export default function JoinPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <JoinForm />
    </main>
  );
}
