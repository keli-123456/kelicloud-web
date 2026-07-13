const RECOVERY_KEY = "kelicloud:chunk-load-recovery";
const RECOVERY_TIMEOUT_MS = 1_500;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const dynamicImportPatterns = [
  /failed to fetch dynamically imported module/i,
  /importing a module script failed/i,
  /error loading dynamically imported module/i,
];

function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return "";
}

export function isDynamicImportFailure(error: unknown): boolean {
  const message = errorMessage(error);
  return dynamicImportPatterns.some((pattern) => pattern.test(message));
}

export function claimChunkLoadRecovery(
  error: unknown,
  href: string,
  buildId: string,
  storage: StorageLike,
): boolean {
  if (!isDynamicImportFailure(error)) return false;
  const marker = JSON.stringify({ href, buildId });
  try {
    if (storage.getItem(RECOVERY_KEY) === marker) return false;
    storage.setItem(RECOVERY_KEY, marker);
    return true;
  } catch {
    return false;
  }
}

export function clearChunkLoadRecoveryMarker(storage: StorageLike): void {
  try {
    storage.removeItem(RECOVERY_KEY);
  } catch {
    // Storage is optional; keep the application usable when it is blocked.
  }
}

async function refreshBrowserCaches(): Promise<void> {
  const refresh = (async () => {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(registrations.map((registration) => registration.update()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.allSettled(keys.map((key) => caches.delete(key)));
    }
  })();

  await Promise.race([
    refresh,
    new Promise<void>((resolve) => window.setTimeout(resolve, RECOVERY_TIMEOUT_MS)),
  ]);
}

export async function recoverChunkLoadFailure(error: unknown): Promise<boolean> {
  const buildId =
    document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.src ?? __BUILD_TIME__;
  if (!claimChunkLoadRecovery(error, window.location.href, buildId, window.sessionStorage)) {
    return false;
  }

  try {
    await refreshBrowserCaches();
  } catch {
    // The guarded reload is still useful if cache cleanup fails.
  }
  window.location.reload();
  return true;
}
