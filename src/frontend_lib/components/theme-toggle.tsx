"use client";

import { useEffect, useState } from "react";

type SelectedTheme = "light" | "dark" | "system";

function getSavedTheme(): SelectedTheme {
  if (typeof window === "undefined") return "system";
  const saved = window.localStorage.getItem("theme");
  if (saved === "light" || saved === "dark" || saved === "system") return saved;
  return "system";
}

function applyThemeSelection(selection: SelectedTheme) {
  if (selection === "system") {
    document.documentElement.removeAttribute("data-theme");
    window.localStorage.setItem("theme", "system");
    return;
  }

  document.documentElement.setAttribute("data-theme", selection);
  window.localStorage.setItem("theme", selection);
}

export function ThemeToggle({ iconOnly }: { iconOnly?: boolean }) {
  const [selection, setSelection] = useState<SelectedTheme>("system");
  const [effective, setEffective] = useState<"light" | "dark">(() =>
    typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
  );

  useEffect(() => {
    const saved = getSavedTheme();
    setSelection(saved);
    applyThemeSelection(saved);

    // listen for system preference changes when selection is system
    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setEffective(e.matches ? "dark" : "light");
    if (mql && mql.addEventListener) {
      mql.addEventListener("change", handler);
    } else if (mql && mql.addListener) {
      // Safari
      // @ts-ignore
      mql.addListener(handler);
    }

    return () => {
      if (mql && mql.removeEventListener) {
        mql.removeEventListener("change", handler);
      } else if (mql && mql.removeListener) {
        // @ts-ignore
        mql.removeListener(handler);
      }
    };
  }, []);

  useEffect(() => {
    if (selection === "system") {
      // update effective immediately from media query
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setEffective(isDark ? "dark" : "light");
    } else {
      setEffective(selection);
    }
  }, [selection]);

  function toggleTheme() {
    const next: SelectedTheme = selection === "system" ? "dark" : selection === "dark" ? "light" : "system";
    setSelection(next);
    applyThemeSelection(next);
  }

  const label = selection === "system" ? "System" : selection === "dark" ? "Light" : "Dark";
  const icon = selection === "system" ? "🌓" : effective === "dark" ? "☾" : "☀";

  return (
    <button
      type="button"
      className={`btn btn-secondary theme-toggle ${iconOnly ? "theme-toggle--icon" : ""}`}
      onClick={toggleTheme}
      aria-label={`Switch theme (current: ${selection})`}
      title={`Theme: ${selection}. Click to cycle system/dark/light`}
    >
      <span aria-hidden="true" className="theme-toggle-icon">{icon}</span>
      {!iconOnly && <span className="theme-toggle-label">{label}</span>}
    </button>
  );
}
