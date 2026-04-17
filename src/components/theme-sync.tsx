"use client";

import { useEffect } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "crafter-theme";

function getPreferredTheme(): Theme {
  const storedTheme = window.localStorage.getItem(STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeSync() {
  useEffect(() => {
    const theme = getPreferredTheme();
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, []);

  return null;
}
