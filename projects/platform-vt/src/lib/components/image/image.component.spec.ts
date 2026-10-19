import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ImageComponent, autoImageProtocol } from './image.component';
import type { TerminalCapabilities } from '../../services/terminal.service';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { provideClickService } from '../../services/click.service';
import { provideKeymapService } from '../../services/keymap.service';
import { MouseService } from '../../services/mouse.service';
import { cleanupDom } from '../../testing/cleanup-dom';

@Component({
  selector: 'vt-image-host',
  imports: [ImageComponent],
  template: `<vt-image
    [src]="src()"
    [width]="4"
    [height]="2"
    [protocol]="protocol"
    [maxBytes]="maxBytes"
  ></vt-image>`,
})
class ImageHostComponent {
  readonly src = signal('');
  protocol: 'auto' | 'iterm2' | 'kitty' | 'sixel' = 'iterm2';
  maxBytes = 10 * 1024 * 1024;
}

/** Build a valid 1x1 RGBA PNG. */
function tinyPng(): Buffer {
  const pngChunk = (type: string, data: Buffer): Buffer => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, 'ascii');
    data.copy(out, 8);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header[8] = 8;
  header[9] = 6;
  header[12] = 0;
  const scanline = Buffer.from([0, 10, 20, 30, 255]);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(scanline)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
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
    cleanupDom();
    dir = mkdtempSync(join(tmpdir(), 'vt-image-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('emits an iTerm2 inline image with the file content', async () => {
    const path = join(dir, 'pixel.png');
    writeFileSync(path, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    const fixture = TestBed.createComponent(ImageHostComponent);
    (fixture.nativeElement as HTMLElement).id = 'vt-root';
    fixture.componentInstance.src.set(path);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
    // The image is emitted after the next layout pass so it can be placed at
    // the component's cell position.
    TestBed.inject(RenderService).flush();

    const writes = (terminal.write as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => String(c[0]))
      .join('');
    expect(writes).toContain('\x1b]1337;File=inline=1');
    // 4 cols * 8 px, 2 rows * 16 px
    expect(writes).toContain('width=32px');
    expect(writes).toContain('height=32px');
    // Base64 of the PNG header.
    expect(writes).toContain('iVBORw0KGgo=');
  });

  it('emits a PNG through the kitty protocol with f=24', async () => {
    const path = join(dir, 'kitty.png');
    writeFileSync(path, tinyPng());

    const fixture = TestBed.createComponent(ImageHostComponent);
    fixture.componentInstance.protocol = 'kitty';
    (fixture.nativeElement as HTMLElement).id = 'vt-root';
    fixture.componentInstance.src.set(path);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
    TestBed.inject(RenderService).flush();

    const writes = (terminal.write as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => String(c[0]))
      .join('');
    expect(writes).toContain('\x1b_Ga=T,f=24,s=1,v=1,m=0;');
  });

  it('rejects non-PNG files on the kitty protocol', async () => {
    const path = join(dir, 'photo.jpg');
    writeFileSync(path, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]));

    const fixture = TestBed.createComponent(ImageHostComponent);
    fixture.componentInstance.protocol = 'kitty';
    (fixture.nativeElement as HTMLElement).id = 'vt-root';
    fixture.componentInstance.src.set(path);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
    TestBed.inject(RenderService).flush();

    const image = (fixture.nativeElement as HTMLElement).querySelector('vt-image')!;
    expect(image.getAttribute('content')).toContain('[image:');
  });

  it('rejects files above maxBytes before reading', async () => {
    const path = join(dir, 'large.png');
    writeFileSync(path, Buffer.alloc(100, 1));

    const fixture = TestBed.createComponent(ImageHostComponent);
    fixture.componentInstance.maxBytes = 10;
    (fixture.nativeElement as HTMLElement).id = 'vt-root';
    fixture.componentInstance.src.set(path);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
    TestBed.inject(RenderService).flush();

    const image = (fixture.nativeElement as HTMLElement).querySelector('vt-image')!;
    expect(image.getAttribute('content')).toContain('[image:');
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

describe('autoImageProtocol', () => {
  const caps = (termProgram: string, term: string): TerminalCapabilities => ({
    colors: 'truecolor',
    unicode: true,
    isTTY: true,
    termProgram,
    term,
  });

  it('prefers iterm2 for iTerm.app', () => {
    expect(autoImageProtocol(caps('iTerm.app', 'xterm-256color'))).toBe('iterm2');
  });

  it('prefers kitty for kitty/wezterm/ghostty', () => {
    expect(autoImageProtocol(caps('', 'xterm-kitty'))).toBe('kitty');
    expect(autoImageProtocol(caps('WezTerm', 'xterm-256color'))).toBe('kitty');
    expect(autoImageProtocol(caps('ghostty', 'xterm-256color'))).toBe('kitty');
  });

  it('prefers sixel for foot/xterm-style terminals', () => {
    expect(autoImageProtocol(caps('foot', 'foot'))).toBe('sixel');
    expect(autoImageProtocol(caps('', 'xterm-256color'))).toBe('sixel');
  });

  it('falls back to iterm2 for unknown terminals', () => {
    expect(autoImageProtocol(caps('', 'dumb'))).toBe('iterm2');
  });
});
