import { Component, input, inject, effect, ElementRef } from '@angular/core';
import { RenderService } from '../../services/render.service';
import { STYLE_READER, type VTStyleReader } from '../../styles/style-registry';

const CHARS: Record<string, string> = {
  single: '\u2500',
  double: '\u2550',
  thick: '\u2581',
};

@Component({
  selector: 'vt-separator',
  template: '',
})
export class SeparatorComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;

  readonly style = input<'single' | 'double' | 'thick'>('single');
  readonly width = input<number | 'auto'>('auto');

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const themed = this.styleReader.get('vt-separator');
      const ch = CHARS[String(themed['style'] ?? this.style())] ?? CHARS['single'];
      const w = themed['width'] ?? this.width();
      el.setAttribute('display', 'block');
      el.setAttribute('width', String(w));
      el.setAttribute('min-height', '1');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('content', ch);
      el.textContent = ch;
      this.renderService.scheduleRender();
    });
  }
}
