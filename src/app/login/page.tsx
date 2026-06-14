import { LoginForm } from "./LoginForm";

// Auth pages are inherently dynamic - opt out of static prerender so the build
// never needs Supabase env vars at build time.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <LoginForm />
    </main>
  );
}
