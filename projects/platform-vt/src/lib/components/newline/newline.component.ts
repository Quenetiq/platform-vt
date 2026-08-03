import { Component, input, inject, effect, ElementRef } from '@angular/core';
import { RenderService } from '../../services/render.service';

@Component({
  selector: 'vt-newline',
  template: '',
})
export class NewlineComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly renderService = inject(RenderService);

  readonly count = input<number>(1);

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      el.setAttribute('height', String(this.count()));
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('content', '');
      this.renderService.scheduleRender();
    });
  }
}
