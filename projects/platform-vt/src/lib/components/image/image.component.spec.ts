import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ImageComponent } from './image.component';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { provideClickService } from '../../services/click.service';
import { provideKeymapService } from '../../services/keymap.service';
import { MouseService } from '../../services/mouse.service';

@Component({
  selector: 'vt-image-host',
  imports: [ImageComponent],
  template: `<vt-image [src]="src()" [width]="4" [height]="2"></vt-image>`,
})
class ImageHostComponent {
  readonly src = signal('');
}

describe('ImageComponent', () => {
  let terminal: TerminalService;
  let dir: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ImageHostComponent],
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
    terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);
    dir = mkdtempSync(join(tmpdir(), 'vt-image-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('emits an iTerm2 inline image with the file content', async () => {
    const path = join(dir, 'pixel.png');
    writeFileSync(path, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    const fixture = TestBed.createComponent(ImageHostComponent);
    fixture.componentInstance.src.set(path);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));

    const writes = (terminal.write as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0])).join('');
    expect(writes).toContain('\x1b]1337;File=inline=1');
    // 4 cols * 8 px, 2 rows * 16 px
    expect(writes).toContain('width=32px');
    expect(writes).toContain('height=32px');
    // Base64 of the PNG header.
    expect(writes).toContain('iVBORw0KGgo=');
  });

  it('reserves grid space and falls back to a text placeholder on missing files', async () => {
    const fixture = TestBed.createComponent(ImageHostComponent);
    fixture.componentInstance.src.set(join(dir, 'missing.png'));
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));

    const host = fixture.nativeElement as HTMLElement;
    const image = host.querySelector('vt-image')!;
    expect(image.getAttribute('width')).toBe('4');
    expect(image.getAttribute('height')).toBe('2');
    expect(image.getAttribute('content')).toContain('[image:');
  });
});