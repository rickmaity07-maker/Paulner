"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/lib/language";
import { authenticate, type LoginState } from "./actions";

const INPUT =
  "h-12 w-full rounded-full bg-black/30 px-5 text-base text-chrome ring-1 ring-inset ring-chrome/20 transition-shadow duration-300 placeholder:text-chrome/40 focus:outline-none focus:ring-2 focus:ring-neon";

const INITIAL: LoginState = { error: null, email: "" };

interface Props {
  next: string;
  initialMode: "signin" | "signup";
  /* Shown only when the Google OAuth keys are configured. */
  google: boolean;
  googleFailed: boolean;
}

export default function LoginForm({ next, initialMode, google, googleFailed }: Props) {
  const { t } = useLanguage();
  const copy = t.login;
  const [mode, setMode] = useState(initialMode);
  const [state, action, pending] = useActionState(authenticate, INITIAL);

  return (
    <>
      <h1 className="display text-4xl text-chrome">{mode === "signin" ? copy.title : copy.titleSignup}</h1>
      <p className="mt-3 text-sm leading-relaxed text-chrome/65">{next === "/#book" ? copy.subtitleBooking : copy.subtitle}</p>

      <div role="tablist" className="mt-8 grid grid-cols-2 gap-1 rounded-full bg-black/30 p-1 ring-1 ring-chrome/10">
        {(["signin", "signup"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={`label relative rounded-full py-3 transition-colors duration-500 ease-leaf ${
              mode === value ? "text-chrome" : "text-chrome/60 hover:text-chrome"
            }`}
          >
            {mode === value && (
              <motion.span layoutId="login-tab" transition={{ type: "spring", stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-full bg-amber" />
            )}
            <span className="relative">{value === "signin" ? copy.tabSignIn : copy.tabSignUp}</span>
          </button>
        ))}
      </div>

      {google && (
        <>
          <a
            href={`/api/auth/google${next ? `?${new URLSearchParams({ next })}` : ""}`}
            className="mt-8 flex h-12 items-center justify-center gap-3 rounded-full bg-chrome text-sm font-semibold text-asphalt transition-colors duration-500 ease-leaf hover:bg-white"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            {copy.google}
          </a>
          <div className="mt-6 flex items-center gap-3 text-xs text-chrome/50">
            <span className="h-px flex-1 bg-chrome/15" />
            {copy.or}
            <span className="h-px flex-1 bg-chrome/15" />
          </div>
        </>
      )}
      {googleFailed && (
        <p role="alert" className="mt-6 text-sm text-neon">
          {copy.errors.google}
        </p>
      )}

      <form action={action} className={`${google ? "mt-6" : "mt-8"} flex flex-col gap-5`}>
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="next" value={next} />
        {mode === "signup" && (
          <label className="flex flex-col gap-2">
            <span className="label text-chrome/80">{copy.name}</span>
            <input name="name" autoComplete="name" className={INPUT} />
          </label>
        )}
        <label className="flex flex-col gap-2">
          <span className="label text-chrome/80">{copy.email}</span>
          <input name="email" type="email" required autoComplete="username" defaultValue={state.email} className={INPUT} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label text-chrome/80">{copy.password}</span>
          <input
            name="password"
            type="password"
            required
            minLength={mode === "signup" ? 8 : undefined}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className={INPUT}
          />
          {mode === "signup" && <span className="text-sm text-chrome/55">{copy.passwordHint}</span>}
        </label>

        <p className="text-xs leading-relaxed text-chrome/55">
          {copy.privacyNote}{" "}
          <Link href="/datenschutz" className="underline underline-offset-2 hover:text-chrome">
            {copy.privacyLink}
          </Link>
          .
        </p>

        {state.error && (
          <p role="alert" className="text-sm text-neon">
            {copy.errors[state.error]}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="label mt-2 rounded-full bg-amber py-4 text-chrome transition-colors duration-500 ease-leaf hover:bg-neon active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? copy.loading : mode === "signin" ? copy.submit : copy.submitSignup}
        </button>
      </form>

      <Link href="/" className="mt-6 inline-flex min-h-10 items-center text-sm text-chrome/55 transition-colors hover:text-chrome">
        {copy.back}
      </Link>
    </>
  );
}
