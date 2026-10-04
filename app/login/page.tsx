import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import LanguageToggle from "@/components/LanguageToggle";
import Shield from "@/components/Shield";
import { getSession, safeNext } from "@/lib/auth";
import { isGoogleConfigured } from "@/lib/google";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Anmelden | Paulaner Meets Route 66",
  robots: { index: false },
};

type Params = Promise<Record<string, string | string[] | undefined>>;

/*
  One login page for everyone, as on the Bar-05 site. The account's role
  decides where it leads: owners to the admin portal, guests to their profile.
*/
export default async function LoginPage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const session = await getSession();
  if (session) redirect(next || (session.role === "owner" ? "/admin" : "/profile"));

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-asphalt px-4 py-16 text-chrome">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_40%_at_50%_0%,rgba(255,61,94,0.22),transparent_70%),radial-gradient(40%_40%_at_100%_100%,rgba(31,120,173,0.22),transparent_70%)]"
      />
      <div className="absolute right-4 top-4">
        <LanguageToggle tone="dark" />
      </div>
      <div className="relative w-full max-w-md">
        <Link href="/" className="mx-auto flex w-fit flex-col items-center gap-3" aria-label="Paulaner Meets Route 66">
          <Shield className="h-20 w-18 drop-shadow-[0_10px_30px_rgba(255,61,94,0.35)]" />
          <span className="display text-xl leading-tight">
            Paulaner <span className="neon">meets</span> Route 66
          </span>
        </Link>
        <div className="mt-8 rounded-[2rem] bg-chrome/5 p-1.5 ring-1 ring-chrome/10 backdrop-blur-xl">
          <div className="rounded-[calc(2rem-0.375rem)] bg-asphalt/70 p-7 shadow-[inset_0_1px_1px_rgba(246,239,230,0.12)] md:p-10">
            <LoginForm
              next={next}
              initialMode={params.mode === "signup" ? "signup" : "signin"}
              google={isGoogleConfigured()}
              googleFailed={params.error === "google"}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
