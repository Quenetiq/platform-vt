import { Component, input, signal, inject, effect, type OnDestroy, ElementRef } from '@angular/core';
import { RenderService } from '../../services/render.service';
import { STYLE_READER, mergeTheme, type VTStyleReader } from '../../styles/style-registry';

const DEFAULT_BLINK_MS = 530;

@Component({
  selector: 'vt-caret',
  template: '',
})
export class CaretComponent implements OnDestroy {
  private readonly elementRef = inject(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;

  readonly glyph = input<string>('\u258C');
  readonly color = input<string>('cyan');
  readonly backgroundColor = input<string>('');
  readonly blink = input<boolean>(true);
  readonly intervalMs = input<number>(DEFAULT_BLINK_MS);

  private readonly visible = signal(true);
  private readonly intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.intervalId = setInterval(() => {
      this.visible.update((v) => !v);
    }, this.intervalMs());

    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const on = this.blink() ? this.visible() : true;
      const g = on ? this.glyph() : '';
      el.textContent = g;
      el.setAttribute('display', 'block');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('min-height', '1');
      el.setAttribute('content', g);
      const t = mergeTheme(this.styleReader, 'vt-caret', {
        glyph: { value: this.glyph(), default: '\u258C' },
        color: { value: this.color(), default: 'cyan' },
        backgroundColor: { value: this.backgroundColor(), default: '' },
      }, (el.getAttribute('class')?.split(/\s+/) ?? []));
      el.setAttribute('color', String(t.color));
      el.setAttribute('background-color', String(t.backgroundColor));
      this.renderService.scheduleRender();
    });
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
