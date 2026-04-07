"use client";

import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

const DEFAULT_THEME: Theme = "dark";
const THEME_STORAGE_KEY = "shoptalk-theme";
const THEME_CHANGE_EVENT = "shoptalk-theme-change";

const getSystemTheme = (): Theme => {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const getStoredTheme = (): Theme | null => {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return null;
};

const resolveTheme = (): Theme => {
  return getStoredTheme() ?? getSystemTheme();
};

const applyTheme = (theme: Theme) => {
  document.documentElement.classList.toggle("dark", theme === "dark");
};

export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const syncTheme = () => {
      const nextTheme = resolveTheme();

      applyTheme(nextTheme);
      setThemeState((currentTheme) => {
        return currentTheme === nextTheme ? currentTheme : nextTheme;
      });
      setIsReady(true);
    };

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = () => {
      if (!getStoredTheme()) {
        syncTheme();
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === null || event.key === THEME_STORAGE_KEY) {
        syncTheme();
      }
    };

    const handleThemeChange = () => {
      syncTheme();
    };

    syncTheme();

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    };
  }, []);

  const setTheme = useCallback((nextTheme: Theme) => {
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setThemeState(nextTheme);
    setIsReady(true);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  return {
    theme,
    setTheme,
    toggleTheme,
    isReady
  };
};
