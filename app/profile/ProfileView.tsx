"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { SessionUser } from "@/lib/auth";
import { useLanguage } from "@/lib/language";
import { signOut } from "../login/actions";
import { cancelMyReservation, changePassword, deleteMyAccount, updateProfile, type ProfileState } from "./actions";

import Shield from "@/components/Shield";
import LanguageToggle from "@/components/LanguageToggle";
import type { BookingStatus } from "@/lib/types";

export interface MyReservation {
  id: string;
  reference: string;
  date: string;
  time: string;
  guests: number;
  status: BookingStatus;
  upcoming: boolean;
}

const INPUT =
  "h-12 w-full rounded-full bg-white/70 px-5 text-base text-bone ring-1 ring-inset ring-bone/15 transition-shadow duration-300 placeholder:text-sage/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-route disabled:text-sage";
const CARD = "menu-frame paper rounded-[2rem] bg-night";
const CORE = "h-full p-6 md:p-8";
const STATUS_STYLE: Record<BookingStatus, string> = {
  pending: "bg-gold text-asphalt",
  confirmed: "bg-route text-chrome",
  seated: "bg-emerald-700 text-chrome",
  cancelled: "bg-bone/10 text-sage",
  "no-show": "bg-bone/10 text-sage",
};
const INITIAL: ProfileState = { error: null, done: false };

function Button({ children, variant = "solid", confirm }: { children: string; variant?: "solid" | "ghost"; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
      className={`label rounded-full px-6 py-3.5 transition-colors duration-500 ease-leaf active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 ${
        variant === "solid" ? "bg-amber text-chrome hover:bg-bone" : "text-bone ring-1 ring-inset ring-bone/25 hover:bg-bone hover:text-chrome"
      }`}
    >
      {children}
    </button>
  );
}

interface Props {
  me: SessionUser;
  reservations: MyReservation[];
  hasPassword: boolean;
}

export default function ProfileView({ me, reservations, hasPassword }: Props) {
  const { t, locale } = useLanguage();
  const copy = t.profile;
  const [details, saveDetails] = useActionState(updateProfile, INITIAL);
  const [password, savePassword] = useActionState(changePassword, INITIAL);
  const [deleteError, deleteAccount] = useActionState(deleteMyAccount, null);

  const formatDate = (date: string) =>
    new Date(`${date}T12:00:00Z`).toLocaleDateString(locale === "en" ? "en-GB" : "de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

  const upcoming = reservations.filter((r) => r.upcoming).reverse();
  const past = reservations.filter((r) => !r.upcoming);

  const list = (items: MyReservation[], title: string) =>
    items.length > 0 && (
      <>
        <h3 className="label mb-3 mt-8 text-sage first:mt-0">{title}</h3>
        <ul className="flex flex-col gap-3">
          {items.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white/50 p-5 ring-1 ring-bone/10">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`label rounded-full px-3 py-1.5 text-[10px] ${STATUS_STYLE[r.status]}`}>
                    {copy.status[r.status]}
                  </span>
                  <span className="font-mono text-xs text-sage">{r.reference}</span>
                </div>
                <p className="display mt-2 text-2xl text-bone">{formatDate(r.date)}</p>
                <p className="text-sm text-sage">
                  {copy.at(r.time)} · {copy.guests(r.guests)}
                </p>
              </div>
              {r.upcoming && (r.status === "pending" || r.status === "confirmed") && (
                <form action={cancelMyReservation}>
                  <input type="hidden" name="id" value={r.id} />
                  <Button variant="ghost" confirm={copy.cancelConfirm}>
                    {copy.cancel}
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </>
    );

  return (
    <main className="paper min-h-[100dvh] w-full px-4 py-10 md:px-8 md:py-16"><div className="mx-auto max-w-[1100px]">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 text-bone" aria-label="Paulaner Meets Route 66">
          <Shield className="h-12 w-11" />
          <span className="display text-lg leading-tight">
            Paulaner <span className="text-amber">meets</span>
            <br />
            Route 66
          </span>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <LanguageToggle />
          {me.role === "owner" && (
            <a href="/admin" className="label rounded-full bg-bone px-5 py-3 text-chrome transition-colors hover:bg-amber">
              {copy.toAdmin}
            </a>
          )}
          <form action={signOut}>
            <Button variant="ghost">{copy.signOut}</Button>
          </form>
        </div>
      </header>

      <h1 className="display mt-12 text-[clamp(2.5rem,6vw,4.5rem)] leading-none text-bone">{copy.hello(me.name)}</h1>
      <p className="mt-3 break-all text-sage">{me.email}</p>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className={`${CARD} lg:col-span-3`}>
          <div className={CORE}>
            <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="display text-3xl text-bone">{copy.bookings}</h2>
              <Link href="/#book" className="label text-amber hover:text-bone">
                {copy.bookNow} ↗
              </Link>
            </div>
            {reservations.length === 0 ? (
              <p className="text-sage">{copy.noBookings}</p>
            ) : (
              <>
                {list(upcoming, copy.upcoming)}
                {list(past, copy.past)}
              </>
            )}
          </div>
        </section>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className={CARD}>
            <div className={CORE}>
              <h2 className="display text-3xl text-bone">{copy.details}</h2>
              <p className="mt-2 text-sm text-sage">{copy.detailsHint}</p>
              <form action={saveDetails} className="mt-6 flex flex-col gap-4">
                <label className="flex flex-col gap-2">
                  <span className="label text-bone">{copy.name}</span>
                  <input name="name" defaultValue={me.name} required autoComplete="name" className={INPUT} />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="label text-bone">{copy.phone}</span>
                  <input name="phone" type="tel" defaultValue={me.phone} autoComplete="tel" className={INPUT} />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="label text-bone">{copy.email}</span>
                  <input value={me.email} disabled aria-describedby="email-hint" className={INPUT} />
                  <span id="email-hint" className="text-sm text-sage">
                    {copy.emailHint}
                  </span>
                </label>
                {details.error && <p role="alert" className="text-sm text-amber">{copy.errors[details.error]}</p>}
                {details.done && <p role="status" className="text-sm text-emerald-700">{copy.saved}</p>}
                <div>
                  <Button>{copy.save}</Button>
                </div>
              </form>
            </div>
          </section>

          <section className={CARD}>
            <div className={CORE}>
              <h2 className="display text-3xl text-bone">{copy.passwordTitle}</h2>
              <form action={savePassword} className="mt-6 flex flex-col gap-4">
                <input type="text" name="username" value={me.email} autoComplete="username" readOnly hidden />
                {hasPassword ? (
                  <label className="flex flex-col gap-2">
                    <span className="label text-bone">{copy.currentPassword}</span>
                    <input name="current" type="password" required autoComplete="current-password" className={INPUT} />
                  </label>
                ) : (
                  <p className="text-sm text-sage">{copy.googleOnly}</p>
                )}
                <label className="flex flex-col gap-2">
                  <span className="label text-bone">{copy.newPassword}</span>
                  <input name="password" type="password" required minLength={8} autoComplete="new-password" className={INPUT} />
                </label>
                {password.error && <p role="alert" className="text-sm text-amber">{copy.errors[password.error]}</p>}
                {password.done && <p role="status" className="text-sm text-emerald-700">{copy.passwordChanged}</p>}
                <div>
                  <Button>{copy.changePassword}</Button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>

      <section className={`mt-6 ${CARD}`}>
        <div className={`${CORE} grid grid-cols-1 gap-8 md:grid-cols-2`}>
          <div>
            <h2 className="display text-3xl text-bone">{copy.dataTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-sage">{copy.dataBody}</p>
            <a
              href="/api/profile/export"
              className="label mt-6 inline-block rounded-full px-6 py-3.5 text-bone ring-1 ring-inset ring-bone/25 transition-colors duration-500 ease-leaf hover:bg-bone hover:text-chrome"
            >
              {copy.download}
            </a>
            <p className="mt-6 text-sm">
              <Link href="/datenschutz" className="text-sage underline underline-offset-4 hover:text-bone">
                {copy.privacy}
              </Link>
            </p>
          </div>
          <form action={deleteAccount} className="flex flex-col gap-4">
            <h2 className="display text-3xl text-bone">{copy.deleteTitle}</h2>
            <p className="text-sm leading-relaxed text-sage">{copy.deleteBody}</p>
            <label className="flex flex-col gap-2">
              <span className="label text-bone">{copy.deleteConfirm}</span>
              <input name="confirm" type="email" required autoComplete="off" placeholder={me.email} className={INPUT} />
            </label>
            {deleteError && <p role="alert" className="text-sm text-amber">{copy.deleteErrors[deleteError]}</p>}
            <div>
              <Button variant="ghost" confirm={copy.deleteButton + "?"}>
                {copy.deleteButton}
              </Button>
            </div>
          </form>
        </div>
      </section>

      <Link href="/" className="mt-8 inline-flex min-h-10 items-center text-sm text-sage transition-colors hover:text-bone">
        {copy.back}
      </Link>
      </div>
    </main>
  );
}
