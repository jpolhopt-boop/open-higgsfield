"use client";

import { useEffect } from "react";

/** Registers the install/offline worker. Production only: in dev it would sit
    between the page and the hot-reload server. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
