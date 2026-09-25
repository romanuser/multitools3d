"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "install-prompt-dismissed-at";
const DISMISS_DAYS = 14;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isDismissedRecently() {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const elapsedDays = (Date.now() - Number(raw)) / (1000 * 60 * 60 * 24);
  return elapsedDays < DISMISS_DAYS;
}

function isStandalone() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Safari no iOS não tem instalação automática (sem beforeinstallprompt), então
// o único caminho é ensinar o passo manual de "Adicionar à Tela de Início".
export function InstallPrompt() {
  const [mode, setMode] = useState<"hidden" | "android" | "ios">("hidden");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || isDismissedRecently()) return;

    if (isIos()) {
      const timer = setTimeout(() => setMode("ios"), 2500);
      return () => clearTimeout(timer);
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setMode("android");
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setMode("hidden");
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setMode("hidden");
    else dismiss();
  }

  if (mode === "hidden") return null;

  return (
    <div
      role="dialog"
      aria-label="Instalar o app"
      className="fixed inset-x-3 bottom-24 z-50 sm:inset-x-auto sm:right-4 sm:bottom-24 sm:w-96"
    >
      <div className="flex gap-3 rounded-2xl border border-line bg-surface p-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)]">
        <span className="inline-flex items-center justify-center rounded-lg bg-amber text-on-accent shrink-0" style={{ width: 40, height: 40 }}>
          📦
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">Adicione à tela de início</p>

          {mode === "android" ? (
            <>
              <p className="mt-0.5 text-sm text-ink-muted">Abra o painel direto, sem passar pelo navegador.</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={install}
                  className="rounded-lg bg-amber px-3.5 py-2 text-sm font-medium text-on-accent transition hover:brightness-110"
                >
                  Instalar
                </button>
                <button
                  onClick={dismiss}
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
                >
                  Agora não
                </button>
              </div>
            </>
          ) : (
            <p className="mt-0.5 text-sm text-ink-muted">
              Toque em compartilhar{" "}
              <span aria-hidden="true" className="inline-flex -translate-y-px items-center">
                <ShareIcon />
              </span>{" "}
              e depois em <strong className="font-medium text-ink">Adicionar à Tela de Início</strong>.
            </p>
          )}
        </div>

        <button
          onClick={dismiss}
          aria-label="Fechar aviso"
          className="h-6 w-6 shrink-0 text-ink-muted transition-colors hover:text-ink"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12" />
    </svg>
  );
}
