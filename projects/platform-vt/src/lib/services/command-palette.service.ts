import { DestroyRef, Injectable, inject, makeEnvironmentProviders, signal, type EnvironmentProviders } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { InputService } from '../services/input.service';
import { KeymapService } from '../services/keymap.service';
import { OverlayService } from '../overlay/overlay.service';
import type { OverlayRef } from '../overlay/overlay-ref';
import { PaletteComponent, type PaletteCommand } from '../components/palette/palette.component';

/**
 * The Ctrl+P command palette: a fuzzy-searchable list of app commands.
 *
 * Register commands with {@link register}; {@link open} shows the palette in
 * an overlay (it also opens on the default `ctrl-p` binding). Activating a
 * command runs its action and closes the palette; `escape` closes it.
 *
 * @example
 * ```typescript
 * const palette = inject(CommandPaletteService);
 * palette.register({
 *   title: 'Save file',
 *   keywords: 'save write',
 *   hint: 'Ctrl+S',
 *   action: () => this.save(),
 * });
 * palette.open();
 * ```
 */
@Injectable()
export class CommandPaletteService {
  private readonly overlayService = inject(OverlayService);
  private readonly keys = inject(KeymapService);
  private readonly input = inject(InputService);
  private readonly destroyRef = inject(DestroyRef);

  /** All registered commands. */
  readonly commands = signal<PaletteCommand[]>([]);

  /** Whether the palette is currently open. */
  readonly isOpen = signal(false);

  private overlay: OverlayRef | null = null;

  constructor() {
    this.keys.bind('ctrl-p', () => {
      this.toggle();
    });

    // Closing via escape when the palette overlay is open.
    this.input.keyEvents
      .pipe(
        filter((event) => event.name === 'escape' && this.isOpen()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.close();
      });
  }

  /** Register a command (idempotent by title). */
  register(command: PaletteCommand): void {
    this.commands.update((list) => {
      if (list.some((c) => c.title === command.title)) return list;
      return [...list, command];
    });
  }

  /** Unregister a command by title. */
  unregister(title: string): void {
    this.commands.update((list) => list.filter((c) => c.title !== title));
  }

  /** Open the palette (no-op when already open). */
  open(): void {
    if (this.isOpen()) return;
    if (this.commands().length === 0) return;

    const overlay = this.overlayService.create({ closeOnEscape: false });
    const componentRef = overlay.attach(PaletteComponent, {
      commands: this.commands(),
    });
    overlay.setPosition(2, 1);
    this.overlay = overlay;
    this.isOpen.set(true);

    const palette = componentRef.instance;
    palette.selected.subscribe((command) => {
      this.close();
      command.action();
    });
    palette.cancelled.subscribe(() => {
      this.close();
    });
  }

  /** Close the palette. */
  close(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.overlay?.dispose();
    this.overlay = null;
  }

  /** Toggle the palette open/closed. */
  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }
}

/**
 * Provide the command palette service.
 */
export function provideCommandPalette(): EnvironmentProviders {
  return makeEnvironmentProviders([CommandPaletteService]);
}