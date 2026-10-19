import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  inject,
  input,
  signal,
  viewChild,
  type ApplicationRef,
  type Type,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { TerminalService } from '@quenetiq/platform-vt';
import { RenderService } from '@quenetiq/platform-vt';
import { InputService } from '@quenetiq/platform-vt';
import { FocusService } from '@quenetiq/platform-vt';
import { provideClickService } from '@quenetiq/platform-vt';
import { provideKeymapService } from '@quenetiq/platform-vt';
import { provideClipboardService } from '@quenetiq/platform-vt';
import { provideWheelService } from '@quenetiq/platform-vt';
import { provideSelectionService } from '@quenetiq/platform-vt';
import { provideDragService } from '@quenetiq/platform-vt';
import { provideCommandPalette } from '@quenetiq/platform-vt';
import { DialogService } from '@quenetiq/platform-vt';
import { MenuService } from '@quenetiq/platform-vt';
import type { Cell } from '@quenetiq/platform-vt';

/** Named ANSI colors → CSS colors used by the preview. */
const COLOR_PALETTE: Record<string, string> = {
  black: '#000000',
  red: '#cd4949',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',
  gray: '#666666',
  grey: '#666666',
  'bright-black': '#555555',
  'bright-red': '#f14c4c',
  'bright-green': '#98e024',
  'bright-yellow': '#fdfb38',
  'bright-blue': '#7aa1f1',
  'bright-magenta': '#d95fd3',
  'bright-cyan': '#7adff3',
  'bright-white': '#ffffff',
};

function cssColor(color: string): string {
  const named = COLOR_PALETTE[color.toLowerCase()];
  if (named) return named;
  if (/^#[\da-f]{6}$/i.test(color)) return color;
  return '';
}

function cssFor(cell: Cell): string {
  const parts: string[] = [];
  const fg = cssColor(cell.fg);
  if (fg) parts.push(`color:${fg}`);
  const bg = cssColor(cell.bg);
  if (bg) parts.push(`background:${bg}`);
  if (cell.bold) parts.push('font-weight:bold');
  if (cell.dim) parts.push('opacity:.7');
  if (cell.italic) parts.push('font-style:italic');
  if (cell.underline) parts.push('text-decoration:underline');
  if (cell.inverse) parts.push('filter:invert(1)');
  return parts.join(';');
}

function escapeHtml(char: string): string {
  if (char === ' ') return '&nbsp;';
  if (char === '<') return '&lt;';
  if (char === '>') return '&gt;';
  if (char === '&') return '&amp;';
  return char;
}

/**
 * Renders a real terminal Angular component in the browser.
 *
 * Bootstraps the given standalone component with the platform-vt providers
 * (the render pipeline runs fully in the browser; only stdout writes are
 * no-ops) and paints the virtual screen into styled HTML after every flush.
 * Use {@link press} to drive keyboard interaction, e.g. for docs examples.
 */
@Component({
  selector: 'app-terminal-preview',
  standalone: true,
  template: `
    <div class="preview-frame">
      <div #root></div>
      <pre class="preview-screen" [innerHTML]="screenHtml()"></pre>
    </div>
  `,
  styles: `
    .preview-frame {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 12px;
      overflow: auto;
    }
    .preview-screen {
      margin: 0;
      font:
        13px/1.4 ui-monospace,
        SFMono-Regular,
        Menlo,
        Consolas,
        monospace;
      color: #e5e5e5;
      white-space: pre;
      min-height: 1em;
    }
  `,
})
export class TerminalPreview implements AfterViewInit, OnDestroy {
  /** The standalone component to render. */
  readonly sample = input.required<Type<unknown>>();
  /** Terminal width in columns. */
  readonly cols = input<number>(46);
  /** Terminal height in rows. */
  readonly rows = input<number>(8);

  private readonly root = viewChild.required<ElementRef<HTMLDivElement>>('root');
  private readonly destroyRef = inject(DestroyRef);

  readonly screenHtml = signal('');

  private appRef: ApplicationRef | null = null;
  private renderService: RenderService | null = null;
  private inputService: InputService | null = null;

  async ngAfterViewInit(): Promise<void> {
    const rootEl = this.root().nativeElement;
    rootEl.id = 'vt-root';

    const appRef = await createApplication({
      providers: [
        TerminalService,
        RenderService,
        InputService,
        FocusService,
        provideClickService(),
        provideKeymapService(),
        provideClipboardService(),
        provideWheelService(),
        provideSelectionService(),
        provideDragService(),
        provideCommandPalette(),
        DialogService,
        MenuService,
        provideZonelessChangeDetection(),
      ],
    });
    this.appRef = appRef;
    this.renderService = appRef.injector.get(RenderService);
    this.inputService = appRef.injector.get(InputService);

    this.destroyRef.onDestroy(() => {
      void appRef.destroy();
    });

    await appRef.bootstrap(this.sample(), { hostElement: rootEl });
    this.renderService.onFlush(() => this.paint());
    this.renderService.scheduleRender();
    setTimeout(() => this.paint(), 0);
  }

  ngOnDestroy(): void {
    this.appRef = null;
    this.renderService = null;
    this.inputService = null;
  }

  /** Simulate a key press inside the preview (see InputService.simulateKey). */
  press(...keys: string[]): void {
    for (const name of keys) {
      this.inputService?.simulateKey({
        name,
        ctrl: false,
        meta: false,
        shift: false,
        sequence: '',
      });
    }
  }

  private paint(): void {
    const render = this.renderService;
    if (!render) return;
    const cols = this.cols();
    const rows = this.rows();

    let html = '';
    for (let y = 0; y < rows; y++) {
      let line = '';
      let openStyle = '';
      for (let x = 0; x < cols; x++) {
        const cell = render.getCell(x, y);
        const css = cssFor(cell);
        if (css !== openStyle) {
          if (openStyle) line += '</span>';
          if (css) line += `<span style="${css}">`;
          openStyle = css;
        }
        line += escapeHtml(cell.char);
      }
      if (openStyle) line += '</span>';
      html += line + '\n';
    }
    this.screenHtml.set(html);
  }
}
