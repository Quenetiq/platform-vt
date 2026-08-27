/**
 * Removes the library's global DOM artifacts from the shared document.
 *
 * The unit-test runner may share a single jsdom document across test files
 * (or a stale `#vt-root` / overlay layer may survive between tests). Specs
 * that rely on global lookups (`document.getElementById('vt-root')`,
 * `document.querySelector('vt-overlay-panel')`) must call this in
 * `beforeEach` so stale elements from other files cannot hijack their
 * queries.
 */
export function cleanupDom(): void {
  document
    .querySelectorAll(
      '#vt-root, vt-overlay-container, vt-overlay-panel, vt-error-overlay, vt-toasts, app-root',
    )
    .forEach((el) => el.remove());
}