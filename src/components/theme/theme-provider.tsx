"use client";

import * as React from "react";

import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  isTheme,
  type Theme,
} from "@/config/theme";

/**
 * Theme preference.
 *
 * Light is the default and the product's primary experience. Dark is opt-in and
 * persists in localStorage — a *display* preference, and the only thing this app
 * stores client-side. Balances, investments and transactions are always read from
 * the server; none of them ever live here.
 *
 * The class is applied by an inline script in the document body (see
 * `ThemeScript`) so there is no flash of the wrong theme before hydration.
 *
 * The current theme is genuinely external state — it lives on `<html>` and in
 * localStorage, both of which can change without React's involvement — so it is
 * read through `useSyncExternalStore` rather than mirrored into `useState` and
 * patched up in an effect. That keeps the server render, the pre-paint script and
 * the React tree in agreement without a cascading re-render on mount.
 */

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

/** Subscribers to notify when *this tab* changes the theme. */
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab changing the preference should be reflected here too.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readTheme(): Theme {
  // The class on <html> is authoritative: `ThemeScript` has already applied it,
  // and it stays correct even if localStorage is unreadable.
  if (document.documentElement.classList.contains("dark")) return "dark";

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    // Private browsing can reject reads; the DOM class already answered.
  }

  return DEFAULT_THEME;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private browsing can reject writes; the applied class still holds.
  }

  emit();
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useSyncExternalStore(
    subscribe,
    readTheme,
    () => DEFAULT_THEME
  );

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: applyTheme,
      toggleTheme: () => applyTheme(theme === "dark" ? "light" : "dark"),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside <ThemeProvider>.");
  }
  return context;
}

/**
 * Applies the stored theme before first paint.
 *
 * Defaults to light and only opts into dark when the user explicitly chose it —
 * `prefers-color-scheme` is deliberately *not* consulted, because light is the
 * product default rather than a system-following behaviour.
 */
export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
    THEME_STORAGE_KEY
  )});if(t==="dark"){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}}catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
