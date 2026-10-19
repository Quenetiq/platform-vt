import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SkeletonComponent } from './skeleton.component';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { MouseService } from '../../services/mouse.service';
import { provideClickService } from '../../services/click.service';
import { cleanupDom } from '../../testing/cleanup-dom';

@Component({
  selector: 'vt-skeleton-host',
  imports: [SkeletonComponent],
  template: `<vt-skeleton [lines]="3" [width]="10" [pulse]="false"></vt-skeleton>`,
})
class SkeletonHostComponent {}

describe('SkeletonComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SkeletonHostComponent],
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

  it('renders dimmed bars with a shorter last row', async () => {
    const fixture = TestBed.createComponent(SkeletonHostComponent);
    (fixture.nativeElement as HTMLElement).id = 'vt-root';
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));

    const bars = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('vt-skeleton-bar'),
    ) as HTMLElement[];
    expect(bars).toHaveLength(3);
    expect(bars[0]!.getAttribute('content')).toBe('\u2588'.repeat(10));
    expect(bars[0]!.getAttribute('color')).toBe('gray');
    expect(bars[2]!.getAttribute('content')).toBe('\u2588'.repeat(6));
  });
});
