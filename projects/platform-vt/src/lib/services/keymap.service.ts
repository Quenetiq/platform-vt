import { Injectable, inject, signal, makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { VTKeyEvent } from './input.service';
import { InputService } from './input.service';

/**
 * Normalize a key event to a canonical binding string.
 *
 * Format: `[ctrl-][alt-][shift-]<name>`, e.g. `'ctrl-p'`, `'alt-f'`,
 * `'shift-tab'`, `'ctrl-shift-f'`, `'return'`, `' '`.
 *
 * @param event - The parsed key event.
 * @returns The canonical key string.
 *
 * @example
 * ```typescript
 * keyFromEvent({ name: 'p', ctrl: true, meta: false, shift: false, sequence: '\x10' });
 * // 'ctrl-p'
 * ```
 */
export function keyFromEvent(event: VTKeyEvent): string {
  const parts: string[] = [];
  if (event.ctrl) parts.push('ctrl');
  if (event.meta) parts.push('alt');
  if (event.shift) parts.push('shift');
  parts.push(event.name);
  return parts.join('-');
}

/** A handler registered for a key binding. Returning `false` stops propagation. */
export type KeyHandler = (event: VTKeyEvent) => void | false;

/**
 * Global keyboard shortcut registry.
 *
 * Components and services bind canonical key strings (see
 * {@link keyFromEvent}) to handlers. Bindings are matched in registration
 * order; the first binding whose key string matches receives the event.
 * Handlers that return `false` stop propagation, like DOM events.
 *
 * @example
 * ```typescript
 * const keys = inject(KeymapService);
 * keys.bind('ctrl-p', () => this.palette.open());
 * keys.bind('q', () => this.app.quit(), { when: () => this.modalOpen() });
 * ```
 */
@Injectable()
export class KeymapService {
  private readonly input = inject(InputService);

  /** Signal holding the canonical key string of the most recent key event. */
  readonly lastKey = signal<string | null>(null);

  /** Registered bindings, in registration order. */
  private readonly bindings: {
    keys: string;
    handler: KeyHandler;
    when: () => boolean;
  }[] = [];

  constructor() {
    this.input.keyEvents
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        const key = keyFromEvent(event);
        this.lastKey.set(key);
        this.dispatch(key, event);
      });
  }

  /**
   * Register a key binding.
   *
   * @param keys - Canonical key string(s), space-separated for alternatives
   * (e.g. `'ctrl-p ctrl-shift-p'`).
   * @param handler - Called when the binding matches.
   * @param options - `when` — predicate evaluated at dispatch time; the
   * binding is skipped when it returns `false`.
   * @returns A function that removes the binding.
   */
  bind(
    keys: string,
    handler: KeyHandler,
    options?: { when?: () => boolean },
  ): () => void {
    const binding = {
      keys,
      handler,
      when: options?.when ?? ((): boolean => true),
    };
    this.bindings.push(binding);
    return () => {
      const index = this.bindings.indexOf(binding);
      if (index !== -1) this.bindings.splice(index, 1);
    };
  }

  /**
   * Whether at least one binding would match the given key string right now.
   */
  isBound(key: string): boolean {
    return this.bindings.some(
      (b) => b.when() && b.keys.split(/\s+/).includes(key),
    );
  }

  private dispatch(key: string, event: VTKeyEvent): void {
    for (const binding of this.bindings) {
      if (!binding.when()) continue;
      if (!binding.keys.split(/\s+/).includes(key)) continue;
      const result = binding.handler(event);
      if (result === false) return;
    }
  }
}
/**
 * Provide the global keybinding service.
 */
export function provideKeymapService(): EnvironmentProviders {
  return makeEnvironmentProviders([KeymapService]);
}
