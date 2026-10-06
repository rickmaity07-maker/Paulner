import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, SignOut } from "@phosphor-icons/react/dist/ssr";
import AdminNav from "@/components/admin/AdminNav";
import { ToastProvider } from "@/components/admin/ui";
import Shield from "@/components/Shield";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { signOut } from "../login/actions";

export const metadata: Metadata = {
  title: "Verwaltung | Paulaner Meets Route 66",
  robots: { index: false },
};

/* Only owners get past this point; everyone else is sent to the shared login. Each page and action checks again. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const me = await requireOwner();
  const [{ pending }] = (await db()`
    select count(*)::int as pending from reservations
    where status = 'pending' and date >= (now() at time zone 'Europe/Berlin')::date
  `) as { pending: number }[];

  return (
    <ToastProvider>
      <div lang="de" className="min-h-[100dvh] bg-[#efe4d6] text-bone lg:flex">
        <aside className="sticky top-0 z-30 flex flex-col gap-4 bg-asphalt px-4 py-4 text-chrome lg:h-[100dvh] lg:w-72 lg:shrink-0 lg:gap-6 lg:overflow-y-auto lg:overscroll-contain lg:px-5 lg:py-7">
          <div className="flex items-center justify-between gap-4">
            <Link href="/admin" className="flex items-center gap-3">
              <Shield className="h-11 w-10 shrink-0" />
              <span>
                <span className="display block text-base leading-tight">
                  Paulaner <span className="neon">meets</span> Route 66
                </span>
                <span className="label mt-1 block text-[9px] text-chrome/50">Verwaltung</span>
              </span>
            </Link>
            <div className="flex items-center gap-4 lg:hidden">
              <Link href="/" className="flex items-center gap-1.5 text-xs text-chrome/60 transition-colors hover:text-chrome">
                Website <ArrowRight size={14} />
              </Link>
              <form action={signOut}>
                <button type="submit" className="flex items-center gap-1.5 text-xs text-chrome/60 transition-colors hover:text-chrome">
                  <SignOut size={14} /> Abmelden
                </button>
              </form>
            </div>
          </div>

          {/* Who is signed in and the way out, up top so a short screen never hides them. */}
          <div className="hidden items-center justify-between gap-3 rounded-2xl bg-chrome/5 px-4 py-3 ring-1 ring-chrome/10 lg:flex">
            <div className="min-w-0">
              <p className="truncate text-sm text-chrome" title={me.email}>{me.name || me.email}</p>
              <p className="label mt-1 text-[10px] text-neon">Inhaber</p>
            </div>
            <form action={signOut} className="shrink-0">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-full bg-chrome/10 px-3 py-2 text-xs text-chrome transition-colors hover:bg-route"
              >
                <SignOut size={14} /> Abmelden
              </button>
            </form>
          </div>

          <AdminNav pending={pending} />

          <div className="hidden lg:mt-auto lg:block">
            <Link
              href="/"
              className="flex items-center justify-between rounded-2xl bg-chrome/5 px-4 py-3 text-sm text-chrome/80 ring-1 ring-chrome/10 transition-colors hover:bg-chrome/10"
            >
              Website ansehen <ArrowRight size={16} />
            </Link>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 md:px-8 lg:px-12 lg:py-12">
          <div className="mx-auto max-w-[1200px]">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
