import {
  inject,
  Injectable,
  makeEnvironmentProviders,
  ApplicationRef,
  type EnvironmentProviders,
  EnvironmentInjector,
} from '@angular/core';
import { OverlayContainer } from './overlay-container';
import { OverlayRef, type OverlayOptions } from './overlay-ref';
import { RenderService } from '../services/render.service';
import { MouseService } from '../services/mouse.service';
import { InputService } from '../services/input.service';
import { TerminalService } from '../services/terminal.service';

/**
 * Creates {@link OverlayRef} handles for floating terminal UI.
 *
 * Overlays render on top of the application (hover hints, tooltips, popovers,
 * dropdowns, drag ghosts). Each overlay is a panel in a dedicated DOM layer;
 * the render service paints layers in order, so later overlays paint over
 * earlier ones.
 *
 * @example
 * ```typescript
 * const overlay = inject(OverlayService);
 * const ref = overlay.create({ closeOnEscape: true });
 * ref.setPositionFromRect(() => render.getElementRect(anchor), 'bottom');
 * ref.attach(TooltipComponent);
 * // ...
 * ref.dispose();
 * ```
 */
@Injectable()
export class OverlayService {
  private readonly container = inject(OverlayContainer);
  private readonly renderService = inject(RenderService);
  private readonly terminal = inject(TerminalService);
  private readonly appRef = inject(ApplicationRef);
  private readonly environmentInjector = inject(EnvironmentInjector);

  /**
   * Create a new overlay panel and return a handle to it.
   *
   * The panel starts at (0, 0) with no content. Use
   * {@link OverlayRef.setPosition} / {@link OverlayRef.setPositionFromRect}
   * to place it and {@link OverlayRef.attach} to mount a component onto it.
   *
   * @param options - Behavior options: `closeOnEscape` disposes the overlay
   * when the user presses Esc, `closeOnOutsideClick` disposes it when a
   * click lands outside the panel.
   */
  create(options: OverlayOptions = {}): OverlayRef {
    const panel = this.container.createPanel();
    let input: InputService | null = null;
    let mouse: MouseService | null = null;
    try {
      input = this.appRef.injector.get(InputService);
      mouse = this.appRef.injector.get(MouseService);
    } catch {
      // Overlays still work without input/mouse (e.g. pure display panels).
    }
    return new OverlayRef(
      panel,
      this.renderService,
      this.terminal,
      this.appRef,
      this.environmentInjector,
      this.container,
      input,
      mouse,
      options,
    );
  }
}

/**
 * Provide the overlay services (container, service, mouse reporting).
 *
 * Requires the app to also provide `InputService` and `RenderService` (both
 * are set up by `bootstrapTerminal`).
 */
export function provideOverlay(): EnvironmentProviders {
  return makeEnvironmentProviders([OverlayContainer, OverlayService, MouseService]);
}