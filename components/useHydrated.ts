"use client";

// True once the page's JavaScript has loaded in the browser.
// Submit buttons stay disabled until then, so a very fast click on a slow
// connection can't send the form the "plain HTML" way before React is ready.
import { useEffect, useState } from "react";

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
