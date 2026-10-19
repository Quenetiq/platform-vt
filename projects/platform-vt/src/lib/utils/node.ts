/**
 * Node-only filesystem access without static `node:*` imports.
 *
 * The library's main entry point must stay importable in browsers (the docs
 * and demo apps run in browser builds), so `node:fs` is never imported
 * statically. Use {@link nodeFs} to obtain the module lazily under Node.
 */

/** The subset of `node:fs` the library uses. */
export interface NodeFs {
  readFileSync(path: string): Buffer;
  readFileSync(path: string, encoding: string): string;
  writeFileSync(path: string, data: string, options?: { mode?: number }): void;
  existsSync(path: string): boolean;
  statSync(path: string): { size: number };
}

/** The `node:fs` module, or null when not running under Node. */
export function nodeFs(): NodeFs | null {
  if (typeof process !== 'undefined' && typeof process.getBuiltinModule === 'function') {
    return process.getBuiltinModule('node:fs') as NodeFs;
  }
  try {
    const req = (globalThis as { require?: (id: string) => unknown }).require;
    return req ? (req('node:fs') as NodeFs) : null;
  } catch {
    return null;
  }
}

/**
 * Read a file as a Buffer, or null when unavailable (non-Node or I/O error).
 *
 * @param path - File to read.
 * @param maxBytes - Optional size limit checked before reading, to avoid
 * allocating huge buffers for untrusted paths.
 */
export function readFileBuffer(path: string, maxBytes?: number): Buffer | null {
  const fs = nodeFs();
  if (!fs) return null;
  try {
    if (maxBytes !== undefined) {
      const stat = fs.statSync(path);
      if (!Number.isFinite(stat.size) || stat.size > maxBytes) return null;
    }
    return fs.readFileSync(path);
  } catch {
    return null;
  }
}
