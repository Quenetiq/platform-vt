import { Component, input, signal, inject, effect, type OnDestroy, ElementRef } from '@angular/core';
import { STYLE_READER, type VTStyleReader } from '../../styles/style-registry';

const FRAMES: Record<string, string[]> = {
  dots: ['\u25CB', '\u25D0', '\u25D1', '\u25CF'],
  line: ['\u2508', '\u250C', '\u2500', '\u2510'],
  arc: ['\u25DC', '\u25DD', '\u25DE', '\u25DF'],
};

@Component({
  selector: 'vt-spinner',
  template: '',
})
export class SpinnerComponent implements OnDestroy {
  private readonly elementRef = inject(ElementRef);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;

  readonly type = input<'dots' | 'line' | 'arc'>('dots');
  readonly label = input<string>('');

  private readonly frame = signal(0);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.intervalId = setInterval(() => {
      this.frame.update(f => f + 1);
    }, 100);

    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const frames = FRAMES[this.type()] ?? FRAMES['dots'];
      const f = frames[this.frame() % frames.length] ?? frames[0];
      el.setAttribute('min-height', '1');
      el.setAttribute('content', `${f} ${this.label()}`);
      el.textContent = `${f} ${this.label()}`;
      el.setAttribute('color', String(this.styleReader.get('vt-spinner')['color'] ?? ''));
    });
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
