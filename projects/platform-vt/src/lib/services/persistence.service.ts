import {
  Injectable,
  Injector,
  inject,
  signal,
  effect,
  makeEnvironmentProviders,
  runInInjectionContext,
  type EnvironmentProviders,
  type WritableSignal,
} from '@angular/core';
import { nodeFs } from '../utils/node';
import { TerminalService } from './terminal.service';

/** Keys that could alter an object's prototype when assigned. */
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

/**
 * Persists application state to a JSON file.
 *
 * Signals are saved (debounced) on every change and restored on startup.
 * The file lives under the current working directory (or an absolute path).
 *
 * @example
 * ```typescript
 * const persistence = inject(PersistenceService);
 * const volume = persistence.signal('volume', 50);
 * volume.set(70); // saved to .platform-vt-state.json (debounced)
 * ```
 */
@Injectable()
export class PersistenceService {
  private readonly terminal = inject(TerminalService);
  private readonly injector = inject(Injector);

  private filePath = '.platform-vt-state.json';
  private state: Record<string, unknown> = {};
  private loaded = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  /** Configure the state file path. */
  configure(filePath: string): void {
    if (typeof filePath !== 'string' || filePath.trim().length === 0) {
      throw new Error('PersistenceService.configure: file path must be a non-empty string');
    }
    this.filePath = filePath;
    this.loaded = false;
    this.state = {};
  }

  /**
   * Create (or restore) a persisted signal.
   *
   * @param key - Unique key in the state file.
   * @param initial - Default value when nothing is stored.
   * @returns A signal that loads from disk and saves on every change.
   */
  signal<T>(key: string, initial: T): WritableSignal<T> {
    this.load();
    const stored = this.state[key] as T | undefined;
    const state = signal(stored !== undefined ? stored : initial);

    const service = this;
    // `signal()` may be called after construction (e.g. from a service
    // method); create the effect in the service's injection context.
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const value = state();
        service.save(key, value);
      });
    });

    return state;
  }

  /** Persist a single value immediately (debounced). */
  save<T>(key: string, value: T): void {
    if (UNSAFE_KEYS.has(key)) return;
    this.load();
    this.state[key] = value;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), 200);
  }

  /** Write all pending state to disk now. */
  flush(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    const fs = nodeFs();
    if (!fs) return;
    try {
      // State may contain user data; keep the file private to the user.
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), { mode: 0o600 });
    } catch {
      // State persistence is best-effort (read-only dirs, etc.).
    }
  }

  /** Read the state file once. */
  load(): void {
    const fs = nodeFs();
    if (this.loaded || !fs) return;
    this.loaded = true;
    try {
      if (fs.existsSync(this.filePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as Record<
          string,
          unknown
        >;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          // Never copy prototype-polluting keys from an untrusted state file.
          const safe: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(parsed)) {
            if (!UNSAFE_KEYS.has(key)) safe[key] = value;
          }
          this.state = safe;
        }
      }
    } catch {
      // Corrupt or unreadable state file — start fresh.
    }
  }
}

/**
 * Provide the persistence service.
 */
export function providePersistence(): EnvironmentProviders {
  return makeEnvironmentProviders([PersistenceService]);
}
