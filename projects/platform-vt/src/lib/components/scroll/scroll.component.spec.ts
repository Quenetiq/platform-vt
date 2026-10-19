import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ScrollViewComponent } from './scroll.component';
import { TextComponent } from '../text/text.component';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { MouseService } from '../../services/mouse.service';
import { provideClickService } from '../../services/click.service';
import { provideWheelService } from '../../services/wheel.service';
import { cleanupDom } from '../../testing/cleanup-dom';

@Component({
  selector: 'vt-scroll-host',
  imports: [ScrollViewComponent, TextComponent],
  template: `
    <vt-scroll [height]="3" flexDirection="column" (scrollChange)="scrolled.set($event)">
      @for (line of lines; track line) {
        <vt-text [content]="line"></vt-text>
      }
    </vt-scroll>
  `,
})
class ScrollHostComponent {
  readonly lines = Array.from({ length: 10 }, (_, i) => `line ${String(i)}`);
  readonly scrolled = signal<number | 'bottom'>('bottom');
}

function wheel(direction: 'up' | 'down'): void {
  const code = direction === 'up' ? 64 : 65;
  TestBed.inject(InputService).rawInput.next(`\x1b[<${String(code)};5;2M`);
}

describe('ScrollViewComponent pinning', () => {
  let render: RenderService;
  let fixture: ComponentFixture<ScrollHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ScrollHostComponent],
      providers: [
        TerminalService,
        RenderService,
        InputService,
        FocusService,
        MouseService,
        provideClickService(),
        provideWheelService(),
        provideZonelessChangeDetection(),
      ],
    });
    const terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);
    render = TestBed.inject(RenderService);
    cleanupDom();
  });

  async function mount(): Promise<void> {
    fixture = TestBed.createComponent(ScrollHostComponent);
    (fixture.nativeElement as HTMLElement).id = 'vt-root';
    fixture.detectChanges();
    // Zoneless effects (the scroll attrs) settle on the next tick.
    await new Promise((r) => setTimeout(r, 0));
    render.flush();
  }

  it('starts pinned to the bottom and scrollChange reports the offset', async () => {
    await mount();
    expect(fixture.componentInstance.scrolled()).toBe('bottom');

    wheel('up');
    expect(fixture.componentInstance.scrolled()).toBe(6); // content 10 - viewport 3 - 1
    wheel('up');
    expect(fixture.componentInstance.scrolled()).toBe(5);

    wheel('down');
    expect(fixture.componentInstance.scrolled()).toBe(6);
    wheel('down');
    // Reaching the end re-enables bottom pinning.
    expect(fixture.componentInstance.scrolled()).toBe('bottom');
  });

  it('re-enables bottom pinning after scrolling back to the end', async () => {
    await mount();
    wheel('up');
    expect(fixture.componentInstance.scrolled()).not.toBe('bottom');

    for (let i = 0; i < 10; i++) wheel('down');
    expect(fixture.componentInstance.scrolled()).toBe('bottom');
  });
});
