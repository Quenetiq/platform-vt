import { Component, signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { vi } from 'vitest';
import { ClickableDirective } from '../components/clickable/clickable.directive';
import { FocusService } from './focus.service';
import { InputService } from './input.service';
import { MouseService } from './mouse.service';
import { RenderService } from './render.service';
import { TerminalService } from './terminal.service';
import { provideClickService } from './click.service';
import type { VTClickEvent } from './sgr-mouse';

@Component({
  selector: 'vt-click-test-app',
  imports: [ClickableDirective],
  // eslint-disable-next-line @angular-eslint/component-max-inline-declarations
  template: `
    <div
      vt-clickable
      (clicked)="record($event)"
      width="20"
      height="3"
      content="Click me"
    ></div>
  `,
})
class ClickTestApp {
  readonly clicks = signal<VTClickEvent | null>(null);

  record(event: VTClickEvent): void {
    this.clicks.set(event);
  }
}

describe('click dispatch (end-to-end)', () => {
  let fixture: ComponentFixture<ClickTestApp>;
  let input: InputService;
  let mouse: MouseService;
  let render: RenderService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ClickTestApp],
      providers: [
        TerminalService,
        RenderService,
        InputService,
        FocusService,
        provideClickService(),
        provideZonelessChangeDetection(),
      ],
    });

    const terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);

    fixture = TestBed.createComponent(ClickTestApp);
    input = TestBed.inject(InputService);
    mouse = TestBed.inject(MouseService);
    render = TestBed.inject(RenderService);

    // The render pipeline locates the tree under #vt-root.
    (fixture.nativeElement as HTMLElement).id = 'vt-root';
  });

  it('dispatches a mouse press + release to the clickable under the cursor', () => {
    render.flush();

    input.rawInput.next('\x1b[<0;6;2M');
    input.rawInput.next('\x1b[<0;6;2m');

    const click = fixture.componentInstance.clicks();
    expect(click).not.toBeNull();
    expect(click?.x).toBe(5);
    expect(click?.y).toBe(1);
    expect(mouse.lastClick()?.button).toBe('left');
  });

  it('ignores clicks outside the clickable area', () => {
    render.flush();

    input.rawInput.next('\x1b[<0;30;2M');
    input.rawInput.next('\x1b[<0;30;2m');

    expect(fixture.componentInstance.clicks()).toBeNull();
  });

  it('ignores a release without a preceding press', () => {
    render.flush();

    input.rawInput.next('\x1b[<0;6;2m');

    expect(fixture.componentInstance.clicks()).toBeNull();
  });
});
