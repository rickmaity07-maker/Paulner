"use client";

import { useEffect, useState } from "react";

export interface Account {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: "user" | "owner";
}

/*
  The homepage is prerendered for everyone, so who is signed in is asked
  separately after it loads. Components mounting together share one request;
  it is dropped once answered, so coming back after signing in asks again.
*/
let pending: Promise<Account | null> | null = null;

function fetchAccount() {
  pending ??= fetch("/api/me", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : { user: null }))
    .then((data: { user: Account | null }) => data.user)
    .catch(() => null)
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function useAccount() {
  const [state, setState] = useState<{ account: Account | null; loading: boolean }>({
    account: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;
    fetchAccount().then((account) => {
      if (active) setState({ account, loading: false });
    });
    return () => {
      active = false;
    };
  }, []);

  return state;
}

/* Where to come back to after signing in from a page section. */
export const loginHref = (next: string, mode?: "signup") =>
  `/login?${new URLSearchParams({ next, ...(mode ? { mode } : {}) })}`;
