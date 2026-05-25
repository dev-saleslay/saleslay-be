"use client";

import { useEffect, useRef } from "react";

/** Default 10s for testing; set NEXT_PUBLIC_INBOUND_POLL_MS=21600000 (~6h) in production, or 0 to disable. */
const DEFAULT_POLL_MS = 10_000;

/**
 * Calls POST /api/user/inbound/reconcile on an interval so inbound rows are processed even if the webhook was missed.
 */
export function useInboundReconcilePoll(onAfter?: () => void | Promise<void>) {
  const onAfterRef = useRef(onAfter);
  onAfterRef.current = onAfter;

  useEffect(() => {
    const raw = process.env.NEXT_PUBLIC_INBOUND_POLL_MS;
    const ms = raw === undefined || raw === "" ? DEFAULT_POLL_MS : Number(raw);
    if (!Number.isFinite(ms) || ms <= 0) {
      return;
    }

    const tick = async () => {
      try {
        const res = await fetch("/api/user/inbound/reconcile", {
          method: "POST",
          credentials: "same-origin",
        });
        if (res.ok && onAfterRef.current) {
          await onAfterRef.current();
        }
      } catch {
        /* ignore */
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), ms);
    return () => window.clearInterval(id);
  }, []);
}
