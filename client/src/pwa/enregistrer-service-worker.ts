/** Enregistrement du service worker, strictement reserve au build `--mode pwa`. */

declare global {
  interface WindowEventMap {
    'pierre:pwa-prete': CustomEvent<{ readonly portee: string }>;
    'pierre:pwa-erreur': CustomEvent<{ readonly message: string }>;
  }
}

async function enregistrer(): Promise<void> {
  if (import.meta.env.MODE !== 'pwa' || !('serviceWorker' in navigator)) return;

  try {
    const inscription = await navigator.serviceWorker.register(
      `${import.meta.env.BASE_URL}service-worker.js`,
      {
        scope: import.meta.env.BASE_URL,
        updateViaCache: 'none'
      }
    );
    await navigator.serviceWorker.ready;
    window.dispatchEvent(
      new CustomEvent('pierre:pwa-prete', { detail: { portee: inscription.scope } })
    );
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    console.warn('[pwa] service worker indisponible :', cause);
    window.dispatchEvent(new CustomEvent('pierre:pwa-erreur', { detail: { message } }));
  }
}

if (document.readyState === 'complete') {
  void enregistrer();
} else {
  window.addEventListener('load', () => void enregistrer(), { once: true });
}

export {};
