"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/*
  Keeps a server-rendered admin page in step with the tablets and phones: it
  re-fetches the page every few seconds while the browser tab is visible, and
  right away when it becomes visible again. Shows a small "Live" badge.
*/
export default function LiveRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      startTransition(() => router.refresh());
      setUpdatedAt(Date.now());
    };
    const timer = window.setInterval(refresh, seconds * 1000);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(clock);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, seconds]);

  const ago = Math.max(0, Math.round((now - updatedAt) / 1000));
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-sage ring-1 ring-bone/10" aria-live="off">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
      </span>
      Live · {ago < 2 ? "gerade aktualisiert" : `vor ${ago} s`}
    </span>
  );
}
