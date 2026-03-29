"use client";

import { useEffect, useState } from "react";

export const useSessionValue = (key: string) => {
  const [value, setCurrentValue] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const storedValue = window.sessionStorage.getItem(key);
      setCurrentValue(storedValue);
    } finally {
      setReady(true);
    }
  }, [key]);

  const setValue = (nextValue: string | null) => {
    if (typeof window === "undefined") {
      return;
    }

    if (nextValue === null) {
      window.sessionStorage.removeItem(key);
      setCurrentValue(null);
      return;
    }

    window.sessionStorage.setItem(key, nextValue);
    setCurrentValue(nextValue);
  };

  return {
    ready,
    value,
    setValue
  };
};
