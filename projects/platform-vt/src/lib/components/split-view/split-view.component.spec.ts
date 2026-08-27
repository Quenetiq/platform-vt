import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SplitViewComponent } from './split-view.component';
import { BoxComponent } from '../../components/box/box.component';
import { TextComponent } from '../../components/text/text.component';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { MouseService } from '../../services/mouse.service';
import { KeymapService, provideKeymapService } from '../../services/keymap.service';
import { provideClickService } from '../../services/click.service';

@Component({
  selector: 'vt-split-host',
  imports: [SplitViewComponent, BoxComponent, TextComponent],
  template: `
    <vt-split-view direction="row" [ratio]="ratio()" (ratioChange)="ratio.set($event)">
      <vt-box class="left"><vt-text content="left"></vt-text></vt-box>
      <vt-box class="right"><vt-text content="right"></vt-text></vt-box>
    </vt-split-view>
  `,
})
class SplitHostComponent {
  readonly ratio = signal(0.5);
}

describe('SplitViewComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SplitHostComponent],
      providers: [
        TerminalService,
        RenderService,
        InputService,
        FocusService,
        MouseService,
        provideClickService(),
        provideKeymapService(),
        provideZonelessChangeDetection(),
      ],
    });
    const terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);
  });

  it('splits the panels with flex-grow ratios and inserts a divider', async () => {
    const fixture = TestBed.createComponent(SplitHostComponent);
    fixture.detectChanges();
    // The layout re-applies asynchronously once the projected content lands.
    await new Promise((r) => setTimeout(r, 0));

    const split = (fixture.nativeElement as HTMLElement).querySelector('vt-split-view')!;
    const children = Array.from(split.children) as HTMLElement[];

    const left = split.querySelector('.left') as HTMLElement;
    const right = split.querySelector('.right') as HTMLElement;
    expect(left).not.toBeNull();
    expect(right).not.toBeNull();

    // 0.5 / 0.5 split via flex-grow.
    expect(left.getAttribute('flex-grow')).toBe('0.5');
    expect(right.getAttribute('flex-grow')).toBe('0.5');

    // A divider element exists between the panels.
    const divider = children.find((c) => c.getAttribute('vt-split-panel') === 'divider');
    expect(divider).not.toBeNull();
    expect(divider!.getAttribute('content')).toContain('\u2502');
  });

  it('emits ratio changes on ctrl+arrow keys', () => {
    const fixture = TestBed.createComponent(SplitHostComponent);
    fixture.detectChanges();
    const input = TestBed.inject(InputService);
    const render = TestBed.inject(RenderService);

    const before = fixture.componentInstance.ratio();
    input.simulateKey({ name: 'right', ctrl: true, meta: false, shift: false, sequence: '' });
    fixture.detectChanges();
    render.scheduleRender();
    expect(fixture.componentInstance.ratio()).toBe(before + 0.05);

    input.simulateKey({ name: 'left', ctrl: true, meta: false, shift: false, sequence: '' });
    fixture.detectChanges();
    render.scheduleRender();
    expect(fixture.componentInstance.ratio()).toBe(before);
  });

  it('registers the semantic resize keymap bindings', () => {
    TestBed.createComponent(SplitHostComponent).detectChanges();
    const keys = TestBed.inject(KeymapService);
    expect(keys.isBound('resize-decrease')).toBe(true);
    expect(keys.isBound('resize-increase')).toBe(true);
  });
});