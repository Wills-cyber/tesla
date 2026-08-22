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
 * stores client-side. No financial state ever lives here.
 *
 * The class is applied by an inline script in the document head (see
 * `ThemeScript`) so there is no flash of the wrong theme before hydration; this
 * provider only handles subsequent changes.
 */

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(DEFAULT_THEME);

  // Adopt whatever the inline script already resolved, so state and DOM agree.
  React.useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) setThemeState(stored);
  }, []);

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next);
    const root = document.documentElement;
    root.classList.toggle("dark", next === "dark");
    root.style.colorScheme = next;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing can reject writes; the in-memory theme still applies.
    }
  }, []);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
    }),
    [theme, setTheme]
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
 * Rendered into the body as a `beforeInteractive`-equivalent inline script. It
 * defaults to light and only opts into dark when the user explicitly chose it —
 * `prefers-color-scheme` is deliberately *not* consulted, because light is the
 * product default rather than a system-following behaviour.
 */
export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
    THEME_STORAGE_KEY
  )});if(t==="dark"){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}}catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
