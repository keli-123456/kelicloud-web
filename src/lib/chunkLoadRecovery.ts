const RECOVERY_KEY = "kelicloud:chunk-load-recovery";
const RECOVERY_TIMEOUT_MS = 1_500;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface ChunkLoadRecoveryDependencies {
  getHref: () => string;
  getBuildId: () => string;
  getSessionStorage: () => StorageLike;
  updateServiceWorkers: () => Promise<void>;
  deleteCaches: () => Promise<void>;
  waitForTimeout: () => Promise<void>;
  reload: () => void;
}

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

export function clearChunkLoadRecoveryMarkerFrom(getStorage: () => StorageLike): void {
  try {
    clearChunkLoadRecoveryMarker(getStorage());
  } catch {
    // Accessing sessionStorage itself can throw in restricted browser contexts.
  }
}

function defaultDependencies(): ChunkLoadRecoveryDependencies {
  return {
    getHref: () => window.location.href,
    getBuildId: () =>
      document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.src ?? __BUILD_TIME__,
    getSessionStorage: () => window.sessionStorage,
    updateServiceWorkers: async () => {
      if (!("serviceWorker" in navigator)) return;
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(registrations.map((registration) => registration.update()));
    },
    deleteCaches: async () => {
      if (!("caches" in window)) return;
      const keys = await caches.keys();
      await Promise.allSettled(keys.map((key) => caches.delete(key)));
    },
    waitForTimeout: () =>
      new Promise<void>((resolve) => window.setTimeout(resolve, RECOVERY_TIMEOUT_MS)),
    reload: () => window.location.reload(),
  };
}

export async function recoverChunkLoadFailure(
  error: unknown,
  overrides: Partial<ChunkLoadRecoveryDependencies> = {},
): Promise<boolean> {
  const dependencies = { ...defaultDependencies(), ...overrides };
  let claimed = false;
  try {
    claimed = claimChunkLoadRecovery(
      error,
      dependencies.getHref(),
      dependencies.getBuildId(),
      dependencies.getSessionStorage(),
    );
  } catch {
    return false;
  }
  if (!claimed) return false;

  const cacheCleanup = Promise.resolve().then(dependencies.deleteCaches);
  const workerUpdate = Promise.resolve().then(dependencies.updateServiceWorkers);
  await Promise.race([
    Promise.allSettled([cacheCleanup, workerUpdate]),
    dependencies.waitForTimeout(),
  ]);
  dependencies.reload();
  return true;
}
