import { describe, it, expect, vi } from 'vitest';
import { Component } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GaugeComponent } from './gauge.component';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';

@Component({
  selector: 'vt-gauge-host',
  imports: [GaugeComponent],
  template: `<vt-gauge label="CPU" [value]="73" [max]="100" [width]="10"></vt-gauge>`,
})
class GaugeHostComponent {}

describe('GaugeComponent', () => {
  it('renders a labeled bar with the percentage', () => {
    TestBed.configureTestingModule({
      imports: [GaugeHostComponent],
      providers: [TerminalService, RenderService, provideZonelessChangeDetection()],
    });
    const terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);

    const fixture = TestBed.createComponent(GaugeHostComponent);
    fixture.detectChanges();

    const el = (fixture.nativeElement as HTMLElement).querySelector('vt-gauge')!;
    expect(el.textContent).toContain('CPU');
    expect(el.textContent).toContain('73%');
    expect(el.textContent).toContain('\u2588'.repeat(7));
    expect(el.textContent).toContain('\u2591'.repeat(3));
  });
});
