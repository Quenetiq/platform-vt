import {
  DestroyRef,
  Injectable,
  effect,
  inject,
  makeEnvironmentProviders,
  signal,
  type EnvironmentProviders,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { InputService } from './input.service';
import { OverlayService } from '../overlay/overlay.service';
import type { OverlayRef } from '../overlay/overlay-ref';
import { DevtoolsComponent } from '../components/devtools/devtools.component';

/**
 * Toggles the developer-tools overlay.
 *
 * Press `Ctrl+Shift+D` to show or hide a panel with render statistics, the
 * layout tree size, the focused element and overlays. The overlay requires
 * `provideOverlay()`; without it the service still tracks `visible` but has
 * nothing to paint.
 *
 * `provideDevtools()` adds the service to the app; the shortcut is registered
 * immediately.
 *
 * @example
 * ```typescript
 * bootstrapTerminal(App, {
 *   providers: [provideOverlay(), provideDevtools()],
 * });
 * ```
 */
@Injectable()
export class DevtoolsService {
  private readonly input = inject(InputService);
  private readonly overlayService = inject(OverlayService, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  /** Whether the devtools panel is open. */
  readonly visible = signal(false);

  private readonly panel = signal<OverlayRef | null>(null);

  constructor() {
    this.input.keyEvents
      .pipe(
        filter(
          (event) =>
            (event.ctrl && event.shift && event.name.toLowerCase() === 'd') ||
            event.name === 'f12',
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.toggle());

    effect(() => {
      const ref = this.panel();
      if (ref?.disposed()) {
        this.panel.set(null);
        this.visible.set(false);
      }
    });

    this.destroyRef.onDestroy(() => this.close());
  }

  /** Show the panel when hidden, hide it when visible. */
  toggle(): void {
    if (this.visible()) this.close();
    else this.open();
  }

  /** Open the devtools panel. */
  open(): void {
    if (this.visible()) return;
    this.visible.set(true);
    if (!this.overlayService) return;

    const ref = this.overlayService.create();
    ref.attach(DevtoolsComponent);
    ref.setPosition(1, 1);
    this.panel.set(ref);
  }

  /** Close the devtools panel. */
  close(): void {
    this.visible.set(false);
    const ref = this.panel();
    this.panel.set(null);
    ref?.dispose();
  }
}

/**
 * Provide the developer-tools overlay service.
 *
 * Requires `provideOverlay()` (and the standard bootstrap providers).
 */
export function provideDevtools(): EnvironmentProviders {
  return makeEnvironmentProviders([DevtoolsService]);
}
