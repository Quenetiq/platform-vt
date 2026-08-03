import { Component, input, inject, effect, ElementRef } from '@angular/core';
import { RenderService } from '../../services/render.service';

@Component({
  selector: 'vt-spacer',
  template: '',
})
export class SpacerComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly renderService = inject(RenderService);

  readonly flexGrow = input<number>(1);

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      el.setAttribute('flex-grow', String(this.flexGrow()));
      this.renderService.scheduleRender();
    });
  }
}
