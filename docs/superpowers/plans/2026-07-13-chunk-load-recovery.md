# Dynamic Chunk Load Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover once from transient lazy-loaded JavaScript failures during deployment and serve frontend files with cache policies that prevent stale application shells.

**Architecture:** A dependency-free Web helper classifies dynamic-import errors and guards a single session reload per page and build. The React error boundary invokes it, while the backend embedded-file handler gives HTML and service-worker files revalidation headers, immutable headers to hashed assets, and a real 404 to missing files.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, vite-plugin-pwa/Workbox, Go 1.24, Gin, Node-based unit tests.

## Global Constraints

- Do not change failover V1, failover V2, or any other business behavior.
- Do not add a runtime dependency.
- Automatic recovery may reload only once for the same page and build.
- Non-chunk React errors must continue to render the existing error page.
- Storage, cache, and service-worker failures must not prevent the manual error UI.
- HTML and service-worker files must revalidate; content-hashed assets remain immutable.

---

### Task 1: Web Dynamic-Import Recovery

**Files:**
- Create: `src/lib/chunkLoadRecovery.ts`
- Modify: `script/run-unit-tests.mjs`
- Modify: `src/components/ErrorBoundary.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Produces: `isDynamicImportFailure(error: unknown): boolean`
- Produces: `claimChunkLoadRecovery(error, href, buildId, storage): boolean`
- Produces: `clearChunkLoadRecoveryMarker(storage): void`
- Produces: `recoverChunkLoadFailure(error: unknown): Promise<boolean>`
- Consumes: `__BUILD_TIME__`, browser `sessionStorage`, Cache Storage, and Service Worker APIs.

- [ ] **Step 1: Add failing unit tests**

Add a guarded module load beside the other helper imports in `script/run-unit-tests.mjs`:

```js
let chunkLoadRecovery = {};
try {
  chunkLoadRecovery = loadTsModule("src/lib/chunkLoadRecovery.ts");
} catch {
  // RED phase: assertions below fail until the helper exists.
}
```

Add these tests before the runner loop:

```js
test("chunk recovery recognizes browser dynamic import failures only", () => {
  assert.equal(
    chunkLoadRecovery.isDynamicImportFailure?.(
      new Error("Failed to fetch dynamically imported module: https://example.test/chunk.js"),
    ),
    true,
  );
  assert.equal(
    chunkLoadRecovery.isDynamicImportFailure?.("Importing a module script failed."),
    true,
  );
  assert.equal(
    chunkLoadRecovery.isDynamicImportFailure?.(new Error("error loading dynamically imported module")),
    true,
  );
  assert.equal(chunkLoadRecovery.isDynamicImportFailure?.(new Error("render failed")), false);
});

test("chunk recovery claims only one reload per page and build", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const error = new Error("Failed to fetch dynamically imported module: /assets/chunk.js");

  assert.equal(chunkLoadRecovery.claimChunkLoadRecovery?.(error, "/admin/failover", "build-a", storage), true);
  assert.equal(chunkLoadRecovery.claimChunkLoadRecovery?.(error, "/admin/failover", "build-a", storage), false);
  assert.equal(chunkLoadRecovery.claimChunkLoadRecovery?.(error, "/admin/failover", "build-b", storage), true);
  chunkLoadRecovery.clearChunkLoadRecoveryMarker?.(storage);
  assert.equal(chunkLoadRecovery.claimChunkLoadRecovery?.(error, "/admin/failover", "build-b", storage), true);
});
```

- [ ] **Step 2: Run the unit suite and verify RED**

Run: `npm run test`

Expected: FAIL because `isDynamicImportFailure` is `undefined`.

- [ ] **Step 3: Implement the recovery helper**

Create `src/lib/chunkLoadRecovery.ts`:

```ts
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
```

- [ ] **Step 4: Connect the helper to the error boundary and healthy bootstrap**

In `src/components/ErrorBoundary.tsx`, import `recoverChunkLoadFailure` and add this line to `componentDidCatch`:

```ts
void recoverChunkLoadFailure(error);
```

In `src/main.tsx`, import `clearChunkLoadRecoveryMarker` and add this effect inside `App`:

```ts
React.useEffect(() => {
  const timer = window.setTimeout(() => {
    clearChunkLoadRecoveryMarker(window.sessionStorage);
  }, 30_000);
  return () => window.clearTimeout(timer);
}, []);
```

The cleanup keeps the marker when the app crashes before the healthy interval; a stable app clears it for later deployments.

- [ ] **Step 5: Verify GREEN and build the Web app**

Run: `npm run test`

Expected: all unit tests pass, including the two chunk-recovery tests.

Run: `npm run build`

Expected: TypeScript and Vite exit 0 and generate `dist/sw.js` plus hashed chunks.

- [ ] **Step 6: Commit the Web implementation**

```bash
git add script/run-unit-tests.mjs src/lib/chunkLoadRecovery.ts src/components/ErrorBoundary.tsx src/main.tsx
git commit -m "fix: recover transient chunk load failures"
```

---

### Task 2: Backend Frontend Cache Policy

**Files:**
- Create: `public/public_test.go`
- Modify: `public/public.go`

**Interfaces:**
- Produces: `applyFrontendCachePolicy(c *gin.Context, requestPath string, isIndex bool)`.
- Consumes: the existing embedded `frontendFS` and Gin `NoRoute` handler.

- [ ] **Step 1: Write failing backend tests**

Create `public/public_test.go`:

```go
package public

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func cacheHeaderFor(path string, isIndex bool) string {
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	applyFrontendCachePolicy(context, path, isIndex)
	return recorder.Header().Get("Cache-Control")
}

func TestApplyFrontendCachePolicy(t *testing.T) {
	gin.SetMode(gin.TestMode)
	tests := []struct {
		name     string
		path     string
		isIndex  bool
		expected string
	}{
		{"spa index", "/admin/failover", true, "no-cache, must-revalidate"},
		{"service worker", "/sw.js", false, "no-cache, must-revalidate"},
		{"service worker registration", "/registerSW.js", false, "no-cache, must-revalidate"},
		{"manifest", "/manifest.webmanifest", false, "no-cache, must-revalidate"},
		{"hashed asset", "/assets/chunk-FailoverV1Page-XTF21BC6.js", false, "public, max-age=31536000, immutable"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := cacheHeaderFor(test.path, test.isIndex); got != test.expected {
				t.Fatalf("Cache-Control = %q, want %q", got, test.expected)
			}
		})
	}
}

func TestStaticMissingAssetReturnsNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	Static(&router.RouterGroup, router.NoRoute)

	request := httptest.NewRequest(http.MethodGet, "/assets/missing-release-chunk.js", nil)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusNotFound)
	}
}
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `go test ./public -count=1`

Expected: build FAIL because `applyFrontendCachePolicy` is undefined.

- [ ] **Step 3: Implement the cache policy**

Add this helper to `public/public.go` above `Static`:

```go
func applyFrontendCachePolicy(c *gin.Context, requestPath string, isIndex bool) {
	requestPath = "/" + strings.TrimPrefix(filepath.ToSlash(requestPath), "/")
	if isIndex || requestPath == "/sw.js" || requestPath == "/registerSW.js" || requestPath == "/manifest.webmanifest" {
		c.Header("Cache-Control", "no-cache, must-revalidate")
		return
	}
	if strings.HasPrefix(requestPath, "/assets/") {
		c.Header("Cache-Control", "public, max-age=31536000, immutable")
	}
}
```

Call it in `serveIndex` before either `c.Data` response:

```go
applyFrontendCachePolicy(c, reqPath, true)
```

Call it in the `noRoute` static-file branch before `c.Data`:

```go
applyFrontendCachePolicy(c, reqPath, false)
```

Restore the missing-file guard before `serveIndex`:

```go
if ext := filepath.Ext(reqPath); ext != "" && ext != ".html" {
	c.Status(http.StatusNotFound)
	return
}
```

- [ ] **Step 4: Format and verify GREEN**

Run: `gofmt -w public/public.go public/public_test.go`

Run: `go test ./public -count=1`

Expected: PASS.

Run: `go test ./api/admin ./utils/failover ./utils/failoverv2 -count=1`

Expected: PASS with no failover behavior changes.

- [ ] **Step 5: Commit the backend policy**

```bash
git add public/public.go public/public_test.go
git commit -m "fix: harden frontend release caching"
```

---

### Task 3: Pin, Publish, Deploy, and Smoke Test

**Files:**
- Modify: `kelicloud/frontend-source.env` through `scripts/update-frontend-pin.sh`.

**Interfaces:**
- Consumes: the committed Web `radix` SHA and backend `main` SHA.
- Produces: one production image whose version string identifies both SHAs.

- [ ] **Step 1: Re-run final repository verification**

In `kelicloud-web` run:

```bash
npm run test
npm run build
git diff --check
```

In `kelicloud` run:

```bash
go test ./public ./api/admin ./utils/failover ./utils/failoverv2 -count=1
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 2: Push the Web implementation**

```bash
git push origin radix
git ls-remote origin refs/heads/radix
```

Expected: the remote SHA equals `git rev-parse HEAD`.

- [ ] **Step 3: Pin the exact committed Web SHA in the backend**

From `kelicloud` run:

```bash
bash scripts/update-frontend-pin.sh --from-local ../kelicloud-web
git diff -- frontend-source.env
git add frontend-source.env
git commit -m "chore: pin chunk recovery web build"
```

Expected: `KOMARI_PINNED_FRONTEND_REF` equals the Web `radix` HEAD SHA.

- [ ] **Step 4: Push and verify backend main**

```bash
git push origin main
git ls-remote origin refs/heads/main
```

Expected: the remote SHA equals `git rev-parse HEAD`.

- [ ] **Step 5: Build and switch the production image**

Build the Web `dist`, combine it with `git archive` from the exact backend commit, and build the Docker image on `152.53.37.160:10088`. Read `backendShort` and `webShort` with `git rev-parse --short`, then set `VERSION_HASH` to `${backendShort}-radix-web-${webShort}`; do not handwrite either SHA. Validate the compose file before replacing it, keep the previous image and a dated compose backup, then run `docker compose up -d dashboard`.

- [ ] **Step 6: Smoke test the original failure path**

Run against `https://tanzhen2.huhu.icu`:

```bash
curl -fsSI https://tanzhen2.huhu.icu/sw.js
curl -fsSI https://tanzhen2.huhu.icu/assets/chunk-FailoverV1Page-XTF21BC6.js
curl -sS -o /dev/null -w '%{http_code}\n' https://tanzhen2.huhu.icu/assets/missing-release-chunk.js
curl -fsS https://tanzhen2.huhu.icu/api/version
```

Expected:

- `sw.js` returns `Cache-Control: no-cache, must-revalidate`.
- The current V1 chunk returns HTTP 200 and JavaScript content.
- A missing chunk returns HTTP 404.
- `/api/version` contains both deployed short SHAs.

- [ ] **Step 7: Clean temporary deployment files**

Delete only the exact local archives and verified `/tmp` build directory created by Step 5. Keep the previous production image and compose backup for rollback.
