import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowSquareOut, SignOut } from "@phosphor-icons/react/dist/ssr";
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
        <aside className="sticky top-0 z-30 flex flex-col gap-4 bg-asphalt px-4 py-4 text-chrome lg:h-[100dvh] lg:w-72 lg:shrink-0 lg:gap-8 lg:px-5 lg:py-7">
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
            <Link href="/" target="_blank" className="flex items-center gap-1.5 text-xs text-chrome/60 transition-colors hover:text-chrome lg:hidden">
              Website <ArrowSquareOut size={14} />
            </Link>
          </div>

          <AdminNav pending={pending} />

          <div className="hidden lg:mt-auto lg:block">
            <Link
              href="/"
              target="_blank"
              className="mb-5 flex items-center justify-between rounded-2xl bg-chrome/5 px-4 py-3 text-sm text-chrome/80 ring-1 ring-chrome/10 transition-colors hover:bg-chrome/10"
            >
              Website ansehen <ArrowSquareOut size={16} />
            </Link>
            <p className="break-all text-sm text-chrome">{me.name || me.email}</p>
            {me.name && <p className="break-all text-xs text-chrome/50">{me.email}</p>}
            <p className="label mt-1.5 text-[10px] text-neon">Inhaber</p>
            <form action={signOut} className="mt-4">
              <button type="submit" className="flex items-center gap-2 text-sm text-chrome/60 transition-colors hover:text-chrome">
                <SignOut size={16} /> Abmelden
              </button>
            </form>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 md:px-8 lg:px-12 lg:py-12">
          <div className="mx-auto max-w-[1200px]">{children}</div>
          <form action={signOut} className="mt-12 lg:hidden">
            <button type="submit" className="flex items-center gap-2 text-sm text-sage">
              <SignOut size={16} /> Abmelden ({me.email})
            </button>
          </form>
        </main>
      </div>
    </ToastProvider>
  );
}
