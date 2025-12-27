"use client";

import { useEffect, useState } from "react";
import { isDesktop } from "./capabilities";

/**
 * React hook for safe desktop detection
 * Returns undefined during SSR/initial render to prevent hydration mismatch
 * Returns true/false after mount when platform detection is complete
 */
export function useIsDesktop(): boolean | undefined {
  const [isDesktopApp, setIsDesktopApp] = useState<boolean | undefined>(
    undefined
  );

  useEffect(() => {
    setIsDesktopApp(isDesktop());
  }, []);

  return isDesktopApp;
}
