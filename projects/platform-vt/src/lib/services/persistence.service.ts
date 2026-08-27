import { Injectable, inject, signal, effect, makeEnvironmentProviders, type EnvironmentProviders, type WritableSignal } from '@angular/core';
import * as fs from 'node:fs';
import { TerminalService } from './terminal.service';

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

  private filePath = '.platform-vt-state.json';
  private state: Record<string, unknown> = {};
  private loaded = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  /** Configure the state file path. */
  configure(filePath: string): void {
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
    effect(() => {
      const value = state();
      service.save(key, value);
    });

    return state;
  }

  /** Persist a single value immediately (debounced). */
  save<T>(key: string, value: T): void {
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
    if (typeof process === 'undefined') return;
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
    } catch {
      // State persistence is best-effort (read-only dirs, etc.).
    }
  }

  /** Read the state file once. */
  load(): void {
    if (this.loaded || typeof process === 'undefined') return;
    this.loaded = true;
    try {
      if (fs.existsSync(this.filePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as Record<string, unknown>;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          this.state = parsed;
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