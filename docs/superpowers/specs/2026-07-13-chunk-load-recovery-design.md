# Dynamic Chunk Load Recovery Design

## Problem

During a production container replacement, a browser can request a lazy-loaded
JavaScript chunk while the origin is briefly unavailable. React then renders the
global error page and remains there even after the new container is healthy.
Service worker caching can extend the mismatch between an application shell and
the chunks available from the current release.

## Goals

- Recover automatically from a transient dynamic-import failure.
- Never create an infinite reload loop.
- Keep the existing error page when recovery does not succeed.
- Make the service worker and HTML shell revalidate on every request.
- Keep content-hashed assets cacheable for a long time.
- Do not change failover V1, failover V2, or other business behavior.

## Web Design

Add a small dependency-free recovery helper that:

1. Recognizes browser messages for failed dynamic imports and module script
   loading.
2. Stores a session-scoped recovery marker keyed by the current page URL.
3. Returns permission to reload only once for the same page and build.
4. Clears the marker after a successful application bootstrap so later genuine
   deployments can recover again.

The global React error boundary calls this helper from `componentDidCatch`.
When recovery is allowed, it asks active service workers to update, removes
stale runtime caches where available, and reloads the current URL once. If any
step fails or the marker already exists, the current error UI remains visible.

## Backend Cache Design

The embedded static-file handler sets explicit response policies:

- `index.html` and SPA route responses: `no-cache, must-revalidate`.
- `sw.js`, `registerSW.js`, and the web manifest: `no-cache, must-revalidate`.
- Files under `/assets/` with content hashes: long-lived immutable caching.
- Missing paths with file extensions: HTTP 404 instead of the SPA HTML fallback.

This prevents stale application shells while preserving efficient caching for
immutable bundles.

## Error Handling

- Storage, cache, and service-worker APIs are optional and wrapped in failure
  handling.
- A failed recovery attempt never hides the existing error details and reload
  button.
- Non-chunk React errors are not reloaded automatically.

## Verification

- Unit tests for message recognition and the one-reload guard.
- Go tests for static response status, content type, and cache headers.
- Full Web production build.
- Focused backend tests.
- Production smoke check that the V1 chunk returns JavaScript and the service
  worker returns a revalidation cache policy.
