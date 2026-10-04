"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle, Minus, Plus, SignIn, UserPlus, WarningCircle } from "@phosphor-icons/react";
import Reveal from "@/components/Reveal";
import Shield from "@/components/Shield";
import { loginHref, useAccount } from "@/lib/account";
import { slotsFor, todayISO, validateBooking, weekdayOf, type BookingErrorCode, type BookingErrors, type BookingRequest } from "@/lib/booking";
import type { Dict } from "@/lib/i18n";
import { useLanguage } from "@/lib/language";
import type { BookingRules } from "@/lib/types";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done"; reference: string; booking: BookingRequest }
  | { kind: "failed"; message: string };

const FIELD =
  "w-full rounded-2xl bg-white/60 px-4 py-3.5 text-base text-bone ring-1 ring-inset ring-bone/20 placeholder:text-sage/80 transition-shadow duration-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-route aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-[#c0262d] read-only:bg-bone/[0.04] read-only:text-sage";

function errorText(code: BookingErrorCode | undefined, t: Dict, max: number) {
  if (!code) return undefined;
  return code === "tooMany" ? t.book.errors.tooMany(max) : t.book.errors[code];
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="flex items-center gap-1.5 text-sm text-[#c0262d]">
      <WarningCircle size={16} weight="fill" aria-hidden="true" />
      {message}
    </p>
  );
}

function prettyDate(date: string, t: Dict) {
  const [y, m, d] = date.split("-").map(Number);
  const month = new Date(Date.UTC(y, m - 1, d)).toLocaleString(t.profile.dateLocale, { month: "short", timeZone: "UTC" });
  return `${t.days[weekdayOf(date)]} ${d}. ${month}`;
}

/* The ticket beside the form: fills in as the guest types, gets stamped on success. */
function Ticket({ guests, date, time, name, reference, street }: { guests: number; date: string; time: string; name: string; reference?: string; street: string }) {
  const { t } = useLanguage();
  const c = t.book.ticket;
  const blank = "text-chrome/35";
  return (
    <div className="relative" aria-hidden="true">
      <div className="rounded-t-[1.75rem] bg-asphalt p-7 text-chrome md:p-8">
        <div className="flex items-center justify-between">
          <span className="display text-xl leading-tight">
            Paulaner <span className="text-neon">meets</span>
            <br />
            Route 66
          </span>
          <Shield className="h-14 w-12" />
        </div>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-chrome/55">{c.tableFor}</p>
        <p className="display text-7xl leading-none">{guests}</p>
        <dl className="mt-8 grid grid-cols-2 gap-5">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-chrome/55">{c.date}</dt>
            <dd className={`mt-1 font-mono text-lg ${date ? "" : blank}`}>{date ? prettyDate(date, t) : c.notYet}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-chrome/55">{c.time}</dt>
            <dd className={`mt-1 font-mono text-lg ${time ? "" : blank}`}>{time || c.notYet}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-chrome/55">{c.name}</dt>
            <dd className={`mt-1 truncate text-xl font-medium ${name.trim() ? "" : blank}`}>{name.trim() || c.yourName}</dd>
          </div>
        </dl>
      </div>
      <div className="ticket-tear relative flex items-center justify-between rounded-b-[1.75rem] border-t-2 border-dashed border-chrome/20 bg-asphalt px-7 py-5 text-chrome md:px-8">
        <span className="text-sm text-chrome/60">{reference ? c.reference : c.request}</span>
        <span className="font-mono text-sm">{reference ?? street}</span>
      </div>

      <AnimatePresence>
        {reference && (
          <motion.span
            initial={{ opacity: 0, scale: 2.2, rotate: -24 }}
            animate={{ opacity: 1, scale: 1, rotate: -12 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="display absolute right-6 top-24 rounded-xl border-4 border-neon px-4 py-1 text-3xl text-neon"
          >
            {c.stamp}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Not signed in: the same account flow as the other bars, straight back here afterwards. */
function SignInCard() {
  const { t } = useLanguage();
  return (
    <div className="menu-frame paper flex flex-col gap-5 rounded-[1.75rem] bg-night p-8 md:p-10">
      <h3 className="display text-3xl text-amber md:text-4xl">{t.book.signInTitle}</h3>
      <p className="max-w-[48ch] text-lg leading-relaxed text-sage">{t.book.signInBody}</p>
      <div className="flex flex-wrap gap-3">
        <Link
          href={loginHref("/#book")}
          className="label inline-flex min-h-12 items-center gap-2 rounded-full bg-amber px-6 text-chrome transition-colors duration-500 ease-leaf hover:bg-route"
        >
          <SignIn size={18} weight="bold" /> {t.book.signIn}
        </Link>
        <Link
          href={loginHref("/#book", "signup")}
          className="label inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-bone ring-1 ring-inset ring-bone/25 transition-colors duration-500 ease-leaf hover:bg-bone hover:text-chrome"
        >
          <UserPlus size={18} weight="bold" /> {t.book.signUp}
        </Link>
      </div>
    </div>
  );
}

export default function Book({ rules, street }: { rules: BookingRules; street: string }) {
  const { locale, t } = useLanguage();
  const { account, loading } = useAccount();
  const max = rules.booking.maxGuests;
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [guests, setGuests] = useState(2);
  // Name and phone come from the profile until the guest edits them for this booking.
  const [nameEdit, setName] = useState<string | null>(null);
  const [phoneEdit, setPhone] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<BookingErrors>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const email = account?.email ?? "";
  const name = nameEdit ?? account?.name ?? "";
  const phone = phoneEdit ?? account?.phone ?? "";

  const slots = useMemo(() => slotsFor(date, rules), [date, rules]);
  const closedDay = Boolean(date) && slots.length === 0;
  const openDays = rules.hours.map((day, index) => (day.open ? t.days[index] : null)).filter(Boolean);

  const pickDate = (value: string) => {
    setDate(value);
    if (!slotsFor(value, rules).includes(time)) setTime("");
    setErrors((current) => ({ ...current, date: undefined, time: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const booking: BookingRequest = { date, time, guests, name: name.trim(), email, phone: phone.trim(), note: note.trim() };
    const found = validateBooking(booking, rules, todayISO());
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.getElementById(`book-${Object.keys(found)[0]}`)?.focus();
      return;
    }

    setStatus({ kind: "sending" });
    try {
      const response = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...booking, locale }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.errors) setErrors(data.errors);
        const message = data.code === "paused" ? t.book.errors.paused : data.code === "tooMany" ? t.book.errors.tooManyRequests : data.code === "signIn" ? t.book.errors.signIn : t.book.failed;
        setStatus({ kind: "failed", message });
        return;
      }
      setStatus({ kind: "done", reference: data.reference, booking });
    } catch {
      setStatus({ kind: "failed", message: t.book.unreachable });
    }
  };

  const reset = () => {
    setStatus({ kind: "idle" });
    setDate("");
    setTime("");
    setNote("");
  };

  const sending = status.kind === "sending";
  const done = status.kind === "done";

  return (
    <section id="book" className="scroll-mt-8 px-4 py-24 md:px-10 md:py-36">
      <Reveal>
        <h2 className="display max-w-[16ch] text-[clamp(2.6rem,5.4vw,5.4rem)] leading-[1.02] text-bone">
          {t.book.title} <em>{t.book.titleEm}</em>
        </h2>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-10 md:mt-20 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          {loading ? (
            <div className="h-72 animate-pulse rounded-[1.75rem] bg-bone/[0.05]" />
          ) : !account ? (
            <SignInCard />
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              {done ? (
                <motion.div
                  key="done"
                  role="status"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col gap-6"
                >
                  <CheckCircle size={44} weight="fill" className="text-amber" />
                  <h3 className="display text-4xl text-bone md:text-5xl">{t.book.doneTitle(status.booking.name.split(" ")[0])}</h3>
                  <p className="max-w-[44ch] text-lg leading-relaxed text-sage">{t.book.doneBody(status.booking.email)}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href="/profile"
                      className="label inline-flex min-h-12 items-center rounded-full bg-amber px-6 text-chrome transition-colors duration-500 ease-leaf hover:bg-route"
                    >
                      {t.book.toProfile}
                    </Link>
                    <button
                      type="button"
                      onClick={reset}
                      className="label min-h-12 rounded-full px-6 text-bone ring-1 ring-inset ring-bone/25 transition-colors duration-500 ease-leaf hover:bg-bone hover:text-chrome active:scale-[0.98]"
                    >
                      {t.book.another}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  noValidate
                  onSubmit={submit}
                  aria-busy={sending}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-7"
                >
                  <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label htmlFor="book-date" className="text-sm font-medium text-bone">
                        {t.book.date}
                      </label>
                      <input
                        id="book-date"
                        type="date"
                        lang={locale}
                        min={todayISO()}
                        suppressHydrationWarning
                        value={date}
                        onChange={(event) => pickDate(event.target.value)}
                        aria-invalid={Boolean(errors.date)}
                        aria-describedby="book-date-help book-date-error"
                        className={FIELD}
                      />
                      <p id="book-date-help" className="text-sm text-sage">
                        {openDays.length === 7 ? t.book.everyDay : t.book.openDays(openDays.join(", "))}
                      </p>
                      <FieldError id="book-date-error" message={errorText(errors.date, t, max)} />
                    </div>

                    <div className="flex flex-col gap-2">
                      <span id="book-guests-label" className="text-sm font-medium text-bone">
                        {t.book.guests}
                      </span>
                      <div
                        role="group"
                        aria-labelledby="book-guests-label"
                        className="flex items-center justify-between rounded-2xl bg-white/60 p-1.5 ring-1 ring-inset ring-bone/20"
                      >
                        <button
                          type="button"
                          aria-label={t.book.fewer}
                          disabled={guests <= 1}
                          onClick={() => setGuests((value) => Math.max(1, value - 1))}
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-bone/10 text-bone transition-colors hover:bg-bone/20 active:scale-95 disabled:opacity-35"
                        >
                          <Minus size={18} />
                        </button>
                        <output id="book-guests" aria-live="polite" className="font-mono text-lg text-bone">
                          {t.book.guestCount(guests)}
                        </output>
                        <button
                          type="button"
                          aria-label={t.book.more}
                          disabled={guests >= max}
                          onClick={() => setGuests((value) => Math.min(max, value + 1))}
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-bone/10 text-bone transition-colors hover:bg-bone/20 active:scale-95 disabled:opacity-35"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                      <p className="text-sm text-sage">{t.book.maxNote(max)}</p>
                      <FieldError id="book-guests-error" message={errorText(errors.guests, t, max)} />
                    </div>
                  </div>

                  <fieldset className="flex flex-col gap-3">
                    <legend className="mb-3 text-sm font-medium text-bone">{t.book.time}</legend>
                    {!date ? (
                      <p className="rounded-2xl border border-dashed border-bone/20 px-4 py-5 text-sm text-sage">{t.book.pickDate}</p>
                    ) : closedDay ? (
                      <p className="rounded-2xl border border-dashed border-bone/20 px-4 py-5 text-sm text-sage">{t.book.closedDay}</p>
                    ) : (
                      <div id="book-time" tabIndex={-1} className="flex flex-wrap gap-2 outline-none">
                        {slots.map((slot, index) => {
                          const selected = slot === time;
                          return (
                            <motion.button
                              key={slot}
                              type="button"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.025 }}
                              aria-pressed={selected}
                              onClick={() => {
                                setTime(slot);
                                setErrors((current) => ({ ...current, time: undefined }));
                              }}
                              className={`min-h-11 rounded-full px-4 py-2.5 font-mono text-sm transition-colors duration-300 active:scale-[0.97] ${
                                selected ? "bg-amber text-chrome" : "bg-white/60 text-bone ring-1 ring-inset ring-bone/20 hover:ring-bone/50"
                              }`}
                            >
                              {slot}
                            </motion.button>
                          );
                        })}
                      </div>
                    )}
                    <FieldError id="book-time-error" message={errorText(errors.time, t, max)} />
                  </fieldset>

                  <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label htmlFor="book-name" className="text-sm font-medium text-bone">
                        {t.book.name}
                      </label>
                      <input
                        id="book-name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        aria-invalid={Boolean(errors.name)}
                        aria-describedby="book-name-error"
                        className={FIELD}
                      />
                      <FieldError id="book-name-error" message={errorText(errors.name, t, max)} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label htmlFor="book-email" className="text-sm font-medium text-bone">
                        {t.book.email}
                      </label>
                      <input id="book-email" type="email" value={email} readOnly className={FIELD} />
                      <FieldError id="book-email-error" message={errorText(errors.email, t, max)} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 md:max-w-[calc(50%-0.875rem)]">
                    <label htmlFor="book-phone" className="text-sm font-medium text-bone">
                      {t.book.phone} <span className="font-normal text-sage">{t.book.phoneHint}</span>
                    </label>
                    <input
                      id="book-phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      aria-invalid={Boolean(errors.phone)}
                      aria-describedby="book-phone-error"
                      className={FIELD}
                    />
                    <FieldError id="book-phone-error" message={errorText(errors.phone, t, max)} />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="book-note" className="text-sm font-medium text-bone">
                      {t.book.note} <span className="font-normal text-sage">{t.book.optional}</span>
                    </label>
                    <textarea
                      id="book-note"
                      rows={3}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      aria-invalid={Boolean(errors.note)}
                      aria-describedby="book-note-error"
                      placeholder={t.book.notePlaceholder}
                      className={`${FIELD} resize-none`}
                    />
                    <FieldError id="book-note-error" message={errorText(errors.note, t, max)} />
                  </div>

                  {status.kind === "failed" && (
                    <p role="alert" className="flex items-start gap-2 rounded-2xl bg-[#c0262d]/10 px-4 py-3.5 text-sm text-[#8f1d22]">
                      <WarningCircle size={18} weight="fill" className="mt-px shrink-0" aria-hidden="true" />
                      {status.message}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="label relative flex min-h-14 items-center justify-center overflow-hidden rounded-full bg-amber px-8 text-chrome transition-colors duration-500 ease-leaf hover:bg-route active:scale-[0.99] disabled:cursor-wait md:self-start"
                  >
                    {sending && (
                      <motion.span
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 w-1/3 bg-chrome/30"
                        initial={{ x: "-100%" }}
                        animate={{ x: "300%" }}
                        transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                    <span className="relative">{sending ? t.book.sending : t.book.submit}</span>
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          )}
        </div>

        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-10">
            <Ticket
              guests={done ? status.booking.guests : guests}
              date={done ? status.booking.date : date}
              time={done ? status.booking.time : time}
              name={done ? status.booking.name : name}
              reference={done ? status.reference : undefined}
              street={street}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
