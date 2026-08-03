import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { parseStylesheet } from './parse-stylesheet';
import { StyleRegistry } from './style-registry';
import type { VTStyleSheet } from './stylesheet';

/**
 * Options form of {@link provideStyles}: load the stylesheet from a file.
 *
 * The file is resolved lazily:
 * - in Node.js runtimes the path is read from disk (relative paths are
 *   resolved against the current working directory and `<projectRoot>/src`);
 * - in browsers it is fetched over HTTP.
 *
 * Styles are registered once the content arrives; because the registry is
 * signal-backed, components re-render with the theme automatically.
 *
 * @example
 * ```typescript
 * // main.ts
 * bootstrapTerminal(App, {
 *   providers: [provideStyles({ stylesUrl: './src/styles.vt' })],
 * });
 * ```
 */
export interface StylesUrlOptions {
  /** Path (Node) or URL (browser) of the `.vt` stylesheet file. */
  stylesUrl: string;
}

/** Accepted argument of {@link provideStyles}. */
export type StylesSource = string | VTStyleSheet | StylesUrlOptions;

/**
 * Provide a theme for the terminal UI.
 *
 * Accepts raw DSL source (see {@link parseStylesheet}), an already parsed
 * {@link VTStyleSheet}, or an options object pointing at a stylesheet file
 * (`stylesUrl`). The parsed rules are registered into a {@link StyleRegistry}
 * that components query to fill their style inputs.
 *
 * @param source - Raw DSL string, parsed stylesheet, or `{ stylesUrl }`.
 * @returns An environment provider to add to the application config.
 */
export function provideStyles(source: StylesSource): EnvironmentProviders {
  const registry = new StyleRegistry();

  if (typeof source === 'string' || isStyleSheet(source)) {
    registry.register(typeof source === 'string' ? parseStylesheet(source) : source);
  } else {
    void loadStylesheet(source.stylesUrl)
      .then((content) => registry.register(parseStylesheet(content)))
      .catch((error) =>
        console.error(
          `[platform-vt] Failed to load stylesheet "${source.stylesUrl}":`,
          error,
        ),
      );
  }

  return makeEnvironmentProviders([{ provide: StyleRegistry, useValue: registry }]);
}

function isStyleSheet(source: StylesSource): source is VTStyleSheet {
  return typeof source === 'object' && Array.isArray((source as VTStyleSheet).rules);
}

/**
 * Load the contents of a stylesheet file.
 *
 * Uses `node:fs/promises` when running under Node.js (terminal host), falling
 * back to `fetch` in the browser.
 */
async function loadStylesheet(url: string): Promise<string> {
  const globals = globalThis as {
    process?: { versions?: { node?: string } };
    fetch?: typeof fetch;
  };

  if (typeof globals.process?.versions?.node === 'string') {
    const { readFile } = await import('node:fs/promises');
    const { resolve, basename } = await import('node:path');

    const candidates = url.startsWith('.') ? [resolve(url), resolve('src', basename(url))] : [url];
    let lastError: unknown;

    for (const candidate of candidates) {
      try {
        return await readFile(candidate, 'utf8');
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error(`Stylesheet not found: ${url}`);
  }

  if (typeof globals.fetch !== 'function') {
    throw new Error(`Cannot load stylesheet "${url}": no fetch available`);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch stylesheet "${url}": HTTP ${response.status}`);
  }
  return response.text();
}
