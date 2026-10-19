import { describe, it, expect, vi } from 'vitest';
import { Component } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HeatmapComponent } from './heatmap.component';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';

@Component({
  selector: 'vt-heatmap-host',
  imports: [HeatmapComponent],
  template: `
    <vt-heatmap
      [data]="[[1, 2, 3], [4, 5, 6]]"
      [rowLabels]="['Mon', 'Tue']"
      [columnLabels]="['a', 'b', 'c']"
    ></vt-heatmap>
  `,
})
class HeatmapHostComponent {}

describe('HeatmapComponent', () => {
  it('renders labeled rows and colored cells', () => {
    TestBed.configureTestingModule({
      imports: [HeatmapHostComponent],
      providers: [TerminalService, RenderService, provideZonelessChangeDetection()],
    });
    const terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);

    const fixture = TestBed.createComponent(HeatmapHostComponent);
    fixture.detectChanges();

    const host = (fixture.nativeElement as HTMLElement).querySelector('vt-heatmap')!;
    const rows = host.querySelectorAll('vt-heatmap-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.querySelectorAll('vt-heatmap-cell')).toHaveLength(3);
    expect(host.querySelectorAll('vt-heatmap-labels')).toHaveLength(1);

    const cells = rows[1]!.querySelectorAll('vt-heatmap-cell');
    // Low value is gray, high value is red.
    expect(cells[0]!.getAttribute('color')).toBe('green');
    expect(cells[2]!.getAttribute('color')).toBe('red');
  });
});
