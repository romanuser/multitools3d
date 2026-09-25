"use client";

import { useEffect, useState } from "react";

// Guarda só a intenção "essa pessoa já mexeu no aviso alguma vez" — depois
// disso, toda visita nova começa minimizado (ícone pequeno) em vez de abrir
// o card grande de novo sozinho.
const MODE_KEY = "install-prompt-mode";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

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
  const [platform, setPlatform] = useState<"none" | "android" | "ios">("none");
  // "full" = card grande aberto; "mini" = só o ícone; "hidden" = nada (já
  // instalado, ou o navegador ainda não ofereceu nada pra mostrar).
  const [view, setView] = useState<"hidden" | "full" | "mini">("hidden");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;

    const alreadyInteracted = localStorage.getItem(MODE_KEY) === "minimized";

    if (isIos()) {
      setPlatform("ios");
      if (alreadyInteracted) {
        setView("mini");
      } else {
        const timer = setTimeout(() => setView("full"), 2500);
        return () => clearTimeout(timer);
      }
      return;
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatform("android");
      setView(alreadyInteracted ? "mini" : "full");
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function minimize() {
    localStorage.setItem(MODE_KEY, "minimized");
    setView("mini");
  }

  function expand() {
    setView("full");
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setView("hidden");
    else minimize();
  }

  if (view === "hidden") return null;

  if (view === "mini") {
    return (
      <button
        onClick={expand}
        aria-label="Adicionar à tela de início"
        title="Adicionar à tela de início"
        className="fixed bottom-24 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-amber text-lg text-on-accent shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] transition hover:brightness-110 sm:right-4"
      >
        📲
      </button>
    );
  }

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

          {platform === "android" ? (
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
                  onClick={minimize}
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
          onClick={minimize}
          aria-label="Minimizar aviso"
          title="Minimizar"
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
