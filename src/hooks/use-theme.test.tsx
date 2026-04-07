import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTheme } from "./use-theme";

type MatchMediaListener = (event: MediaQueryListEvent) => void;

type StorageMock = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const installLocalStorage = () => {
  const storage = new Map<string, string>();

  const localStorageMock: StorageMock = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => {
      storage.set(key, value);
    },
    removeItem: (key) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    }
  };

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    writable: true,
    value: localStorageMock
  });
};

const installMatchMedia = (matches: boolean) => {
  const listeners = new Set<MatchMediaListener>();

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addEventListener: (_event: string, listener: MatchMediaListener) => {
        listeners.add(listener);
      },
      removeEventListener: (_event: string, listener: MatchMediaListener) => {
        listeners.delete(listener);
      },
      addListener: (listener: MatchMediaListener) => {
        listeners.add(listener);
      },
      removeListener: (listener: MatchMediaListener) => {
        listeners.delete(listener);
      },
      dispatchEvent: (event: MediaQueryListEvent) => {
        listeners.forEach((listener) => listener(event));
        return true;
      }
    }))
  });
};

const ThemeProbe = () => {
  const { isReady, theme, toggleTheme } = useTheme();

  if (!isReady) {
    return <div data-testid="theme-skeleton" />;
  }

  return (
    <button type="button" onClick={toggleTheme}>
      {theme}
    </button>
  );
};

describe("useTheme", () => {
  beforeEach(() => {
    installLocalStorage();
    window.localStorage.clear();
    installMatchMedia(false);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the loading fallback during server render", () => {
    const html = renderToString(<ThemeProbe />);

    expect(html).toContain("theme-skeleton");
  });

  it("stores the toggled theme under the ShopTalk storage key", async () => {
    render(<ThemeProbe />);

    const lightButton = await screen.findByRole("button", { name: "light" });
    fireEvent.click(lightButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "dark" })).toBeTruthy();
    });

    expect(window.localStorage.getItem("shoptalk-theme")).toBe("dark");
    expect(window.localStorage.getItem("shop-talk-theme")).toBeNull();
  });
});
