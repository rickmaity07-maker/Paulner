"use client";

import { useMemo, useState } from "react";
import { GoogleLogo, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { createUser, resetPassword, setUserActive, setUserRole } from "@/app/admin/actions";
import { Button, Card, Field, Input, PageHeader, Select, useAction } from "@/components/admin/ui";

export interface UserRow {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: "user" | "staff" | "owner";
  active: boolean;
  google: boolean;
  created_at: string;
  last_login_at: string | null;
  bookings: number;
}

const ROLES = {
  user: { label: "Gast", badge: "bg-bone/10", hint: "Reserviert über die Website, kein Zugriff auf Verwaltung oder Tablet-App." },
  staff: { label: "Personal", badge: "bg-route text-chrome", hint: "Darf die Deckel-App auf dem Tablet benutzen, aber nicht die Verwaltung." },
  owner: { label: "Inhaber", badge: "bg-amber text-chrome", hint: "Voller Zugriff auf Verwaltung und Tablet-App." },
} as const;

const stamp = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }) : "nie";

function UserCard({ user, self }: { user: UserRow; self: boolean }) {
  const { pending, run } = useAction();
  const [password, setPassword] = useState("");
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="break-all text-lg font-semibold">{user.email}</p>
          <p className="mt-1 text-sm text-sage">
            {user.name || "Ohne Namen"}
            {user.phone && ` · ${user.phone}`} · {user.bookings} {user.bookings === 1 ? "Reservierung" : "Reservierungen"} · angelegt {stamp(user.created_at)} · zuletzt
            angemeldet {stamp(user.last_login_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ROLES[user.role].badge}`}>{ROLES[user.role].label}</span>
          {user.google && (
            <span className="inline-flex items-center gap-1 rounded-full bg-route/10 px-3 py-1 text-xs font-semibold text-route">
              <GoogleLogo size={12} weight="bold" /> Google
            </span>
          )}
          {!user.active && <span className="rounded-full bg-bone/10 px-3 py-1 text-xs font-semibold text-sage">Deaktiviert</span>}
          {self && <span className="rounded-full px-3 py-1 text-xs font-semibold text-sage ring-1 ring-bone/20">Du</span>}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-bone/[0.06] pt-5">
        {!self && (
          <>
            <span role="group" aria-label={`Rolle von ${user.email}`} className="inline-flex rounded-full bg-night p-1">
              {(["user", "staff", "owner"] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  aria-pressed={user.role === role}
                  disabled={pending || user.role === role}
                  title={ROLES[role].hint}
                  onClick={() => {
                    if (role === "owner" && !window.confirm(`${user.email} zum Inhaber machen? Das Konto erhält vollen Zugriff.`)) return;
                    run(() => setUserRole(user.id, role));
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${user.role === role ? "bg-asphalt text-chrome" : "text-sage hover:text-bone"}`}
                >
                  {ROLES[role].label}
                </button>
              ))}
            </span>
            <Button size="sm" variant={user.active ? "danger" : "secondary"} busy={pending} onClick={() => run(() => setUserActive(user.id, !user.active))}>
              {user.active ? "Deaktivieren" : "Aktivieren"}
            </Button>
          </>
        )}
        <form
          className="flex flex-1 gap-2 sm:min-w-[20rem]"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => resetPassword(user.id, password), () => setPassword(""));
          }}
        >
          <input type="text" name="username" value={user.email} autoComplete="username" readOnly hidden />
          <Input
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            placeholder="Neues Passwort"
            aria-label={`Neues Passwort für ${user.email}`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" size="md" variant="secondary" busy={pending}>
            Setzen
          </Button>
        </form>
      </div>
    </Card>
  );
}

export default function UsersManager({ users, meId }: { users: UserRow[]; meId: string }) {
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "user" });
  const { pending, run } = useAction();
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => !q || u.email.includes(q) || u.name.toLowerCase().includes(q));
  }, [users, query]);
  const owners = users.filter((u) => u.role === "owner" && u.active).length;

  return (
    <>
      <PageHeader
        title="Nutzer & Rollen"
        description={`${users.length} Konten, davon ${owners} ${owners === 1 ? "Inhaber" : "Inhaber"}. Alle melden sich auf derselben Seite an (/login). Gäste brauchen ein Konto zum Reservieren. „Personal“ darf die Deckel-App auf dem Tablet benutzen, nur Inhaber sehen die Verwaltung.`}
      />
      <label className="relative mb-4 block max-w-sm">
        <span className="sr-only">Suchen</span>
        <MagnifyingGlass size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sage" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="E-Mail oder Name" className="!bg-white pl-10" />
      </label>
      <div className="flex flex-col gap-3">
        {visible.map((user) => (
          <UserCard key={`${user.id}-${user.role}-${user.active}`} user={user} self={user.id === meId} />
        ))}
      </div>

      <Card title="Konto anlegen" className="mt-6">
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => createUser(form), () => setForm({ email: "", name: "", password: "", role: "user" }));
          }}
        >
          <Field label="E-Mail">{(id) => <Input id={id} type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />}</Field>
          <Field label="Name">{(id) => <Input id={id} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />}</Field>
          <Field label="Startpasswort" hint="Mindestens 8 Zeichen. Persönlich weitergeben.">
            {(id) => <Input id={id} type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />}
          </Field>
          <Field label="Rolle">
            {(id) => (
              <Select id={id} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="user">Gast (nur reservieren)</option>
                <option value="staff">Personal (Deckel-App auf dem Tablet)</option>
                <option value="owner">Inhaber (voller Zugriff)</option>
              </Select>
            )}
          </Field>
          <div>
            <Button type="submit" variant="primary" busy={pending}>
              <Plus size={16} weight="bold" /> Konto anlegen
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
