import {
  provideZonelessChangeDetection,
  type EnvironmentProviders,
  type Provider,
  type Type,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  FocusService,
  InputService,
  MouseService,
  RenderService,
  TerminalService,
  provideClickService,
} from '@quenetiq/platform-vt';

/** Options for {@link renderComponent}. */
export interface RenderComponentOptions {
  /** Extra providers added after the standard terminal services. */
  providers?: (Provider | EnvironmentProviders)[];
  /** Terminal width in columns (default 80). */
  columns?: number;
  /** Terminal height in rows (default 24). */
  rows?: number;
}

/** Handle returned by {@link renderComponent}. */
export interface RenderedComponent<C> {
  /** The created Angular fixture. */
  fixture: ComponentFixture<C>;
  /** Render pipeline service, for manual flushes. */
  render: RenderService;
  /** Terminal service (size, capabilities). */
  terminal: TerminalService;
  /** Force a synchronous render pass. */
  flush(): void;
  /** Text painted in the last frame (trailing spaces trimmed per line). */
  text(): string;
  /** Destroy the fixture and remove global DOM artifacts. */
  dispose(): void;
}

/**
 * Mount a component as the terminal app root and render one frame.
 *
 * This is the snapshot-testing harness used by terminal UI specs: it wires
 * the standard services, marks the host element as `#vt-root`, runs change
 * detection, flushes the render pipeline and exposes the painted text.
 *
 * @param component - The component to mount (usually an app root).
 * @param options - Extra providers and the virtual terminal size.
 *
 * @example
 * ```typescript
 * const view = await renderComponent(App, { columns: 40, rows: 10 });
 * expect(view.text()).toContain('Hello');
 * view.dispose();
 * ```
 */
export async function renderComponent<C>(
  component: Type<C>,
  options: RenderComponentOptions = {},
): Promise<RenderedComponent<C>> {
  cleanupDom();

  TestBed.configureTestingModule({
    imports: [component as Type<unknown>],
    providers: [
      TerminalService,
      RenderService,
      InputService,
      FocusService,
      MouseService,
      provideClickService(),
      provideZonelessChangeDetection(),
      ...(options.providers ?? []),
    ],
  });

  const terminal = TestBed.inject(TerminalService);
  const render = TestBed.inject(RenderService);
  const columns = options.columns ?? 80;
  const rows = options.rows ?? 24;
  terminal.columns.set(columns);
  terminal.rows.set(rows);

  const fixture = TestBed.createComponent(component);
  (fixture.nativeElement as HTMLElement).id = 'vt-root';
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  render.flush();

  return {
    fixture,
    render,
    terminal,
    flush: (): void => render.flush(),
    text: (): string =>
      trimTrailing(render.getText({ x1: 0, y1: 0, x2: columns - 1, y2: rows - 1 })),
    dispose: (): void => {
      fixture.destroy();
      cleanupDom();
    },
  };
}

/**
 * Remove the library's global DOM artifacts from the shared document.
 *
 * The unit-test runner may share one jsdom document across test files; specs
 * that rely on `#vt-root` or overlay lookups should call this in `beforeEach`.
 */
export function cleanupDom(): void {
  document
    .querySelectorAll(
      '#vt-root, vt-overlay-container, vt-overlay-panel, vt-error-overlay, vt-toasts, app-root',
    )
    .forEach((el) => el.remove());
}

function trimTrailing(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}
