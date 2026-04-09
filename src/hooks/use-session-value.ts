"use client";

import { useEffect, useState } from "react";
import { createLogger } from "@/lib/logger";

const logger = createLogger("session-value");

export const useSessionValue = (key: string) => {
  const [value, setCurrentValue] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const storedValue = window.sessionStorage.getItem(key);
      setCurrentValue(storedValue);
    } catch (error) {
      logger.warn("sessionStorage read failed", error);
      setCurrentValue(null);
    } finally {
      setReady(true);
    }
  }, [key]);

  const setValue = (nextValue: string | null) => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      if (nextValue === null) {
        window.sessionStorage.removeItem(key);
        setCurrentValue(null);
        return;
      }

      window.sessionStorage.setItem(key, nextValue);
      setCurrentValue(nextValue);
    } catch (error) {
      logger.warn("sessionStorage write failed", error);
      setCurrentValue(nextValue);
    }
  };

  return {
    ready,
    value,
    setValue
  };
};
