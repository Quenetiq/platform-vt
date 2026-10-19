import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ChartComponent } from './chart.component';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { MouseService } from '../../services/mouse.service';
import { provideClickService } from '../../services/click.service';
import { cleanupDom } from '../../testing/cleanup-dom';

@Component({
  selector: 'vt-chart-host',
  imports: [ChartComponent],
  template: `<vt-chart [data]="data" [height]="3" [min]="0" [max]="3" [labels]="labels" [kind]="'bar'"></vt-chart>`,
})
class ChartHostComponent {
  readonly data = [3, 1, 2];
  readonly labels = ['aaa', 'b', 'c'];
}

describe('ChartComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ChartHostComponent],
      providers: [
        TerminalService,
        RenderService,
        InputService,
        FocusService,
        MouseService,
        provideClickService(),
        provideZonelessChangeDetection(),
      ],
    });
    const terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);
    cleanupDom();
  });

  it('renders a bar chart with scale and labels', async () => {
    const fixture = TestBed.createComponent(ChartHostComponent);
    (fixture.nativeElement as HTMLElement).id = 'vt-root';
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));

    const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('vt-chart-line')) as HTMLElement[];
    expect(rows).toHaveLength(4); // 3 plot rows + 1 label row

    const texts = rows.map((r) => r.getAttribute('content') ?? '');
    // Scale: max '3' on the top row, min '0' on the bottom plot row.
    expect(texts[0]).toContain('3');
    expect(texts[2]).toContain('0');
    // Bar at column 0 (value 3) fills all rows; column 2 (value 2) misses the top.
    expect(texts[0]!.charAt(SCALE + 0)).toBe('\u2588');
    expect(texts[0]!.charAt(SCALE + 2)).toBe(' ');
    expect(texts[1]!.charAt(SCALE + 2)).toBe('\u2588');
    // Label row contains the per-column truncated labels.
    expect(texts[3]).toContain('abc');
  });
});

const SCALE = 6; // SCALE_WIDTH(5) + separator(1)