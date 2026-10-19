import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { LogViewerComponent, type LogEntry, type LogLevel } from './log-viewer.component';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';
import { InputService, type VTKeyEvent } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { MouseService } from '../../services/mouse.service';
import { provideClickService } from '../../services/click.service';
import { provideWheelService } from '../../services/wheel.service';

@Component({
  selector: 'vt-log-host',
  imports: [LogViewerComponent],
  template: `
    <vt-log-viewer
      [lines]="lines"
      [height]="5"
      [filter]="filter()"
      [levels]="levels"
      [showTimestamps]="showTimestamps"
    ></vt-log-viewer>
  `,
})
class LogHostComponent {
  readonly lines: LogEntry[] = Array.from({ length: 20 }, (_, i) => ({ text: `line ${String(i)}` }));
  readonly filter = signal('');
  levels: LogLevel[] = [];
  showTimestamps = false;
}

function key(name: string): VTKeyEvent {
  return { name, ctrl: false, meta: false, shift: false, sequence: '' };
}

function focusViewer(fixture: ComponentFixture<LogHostComponent>): void {
  const focus = TestBed.inject(FocusService);
  const el = (fixture.nativeElement as HTMLElement).querySelector('vt-log-viewer')!;
  focus.clearFocus();
  focus.focus(el.getAttribute('vt-click-id')!);
}

function rows(fixture: ComponentFixture<LogHostComponent>): string[] {
  return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('vt-log-line')).map(
    (row) => row.textContent ?? '',
  );
}

describe('LogViewerComponent', () => {
  let input: InputService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LogHostComponent],
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
    input = TestBed.inject(InputService);
  });

  it('shows the newest lines and auto-follows', () => {
    const fixture = TestBed.createComponent(LogHostComponent);
    fixture.detectChanges();

    const text = rows(fixture);
    expect(text).toHaveLength(5);
    expect(text[4]).toContain('line 19');
    expect(text[0]).toContain('line 15');
  });

  it('scrolls up and unpins, then re-pins at the bottom', () => {
    const fixture = TestBed.createComponent(LogHostComponent);
    fixture.detectChanges();
    focusViewer(fixture);

    input.simulateKey(key('up'));
    fixture.detectChanges();
    const viewer = fixture.debugElement.children[0]!.componentInstance as LogViewerComponent;
    expect(viewer.pinned()).toBe(false);
    expect(rows(fixture)[4]).toContain('line 18');

    input.simulateKey(key('end'));
    fixture.detectChanges();
    expect(viewer.pinned()).toBe(true);
    expect(rows(fixture)[4]).toContain('line 19');
  });

  it('filters by level and text', () => {
    const fixture = TestBed.createComponent(LogHostComponent);
    fixture.componentInstance.lines.splice(0, fixture.componentInstance.lines.length,
      { text: 'ok', level: 'info' },
      { text: 'boom', level: 'error' },
      { text: 'warn', level: 'warn' },
    );
    fixture.componentInstance.levels = ['error'];
    fixture.detectChanges();

    expect(rows(fixture)[0]).toContain('boom');
    expect(rows(fixture)[1]).toBe('');
  });

  it('filters by text and shows timestamps', () => {
    const fixture = TestBed.createComponent(LogHostComponent);
    fixture.componentInstance.lines.splice(0, fixture.componentInstance.lines.length,
      { text: 'alpha', timestamp: '12:00:01' },
      { text: 'beta', timestamp: '12:00:02' },
    );
    fixture.componentInstance.showTimestamps = true;
    fixture.detectChanges();
    fixture.componentInstance.filter.set('beta');
    fixture.detectChanges();

    expect(rows(fixture)[0]).toContain('[12:00:02]');
    expect(rows(fixture)[0]).toContain('beta');
  });
});
