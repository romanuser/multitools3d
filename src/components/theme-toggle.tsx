"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";

const STORAGE_KEY = "mf3d-theme";

export function ThemeToggle() {
  // Começa "dark" (o padrão da marca) e só troca depois de checar o que
  // está salvo — evita depender de leitura síncrona aqui (isso já é
  // resolvido pelo script anti-flash no layout, que aplica antes do
  // primeiro paint).
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.setAttribute("data-theme", next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-muted hover:text-ink hover:bg-surface-raised/60 transition-colors w-full"
    >
      <Icon name={theme === "dark" ? "moon" : "sun"} className="shrink-0" />
      Tema {theme === "dark" ? "escuro" : "claro"}
    </button>
  );
}
