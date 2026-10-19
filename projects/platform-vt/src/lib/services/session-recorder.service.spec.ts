import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { SessionRecorder } from './session-recorder.service';
import { TerminalService } from './terminal.service';

describe('SessionRecorder security', () => {
  let dir: string;
  let recorder: SessionRecorder;

  beforeEach(() => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    dir = mkdtempSync(join(tmpdir(), 'vt-rec-'));
    TestBed.configureTestingModule({ providers: [TerminalService, SessionRecorder] });
    recorder = TestBed.inject(SessionRecorder);
  });

  afterEach(() => {
    recorder.stop();
    vi.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes recordings with mode 0600', () => {
    const path = join(dir, 'session.cast');
    recorder.start();
    process.stdout.write('hello');
    recorder.stop();
    recorder.exportAsciinema(path);

    expect(readFileSync(path, 'utf8')).toContain('hello');
    expect(statSync(path).mode & 0o777).toBe(0o600);
  });

  it('stops capturing after maxBytes and flags truncation', () => {
    const path = join(dir, 'shot.ansi');
    recorder.maxBytes = 5;
    recorder.start();
    process.stdout.write('123456789');
    recorder.stop();

    expect(recorder.truncated()).toBe(true);
    recorder.exportScreenshot(path);
    expect(readFileSync(path, 'utf8')).toBe('');
  });

  it('captures output under the limit', () => {
    const path = join(dir, 'shot.ansi');
    recorder.maxBytes = 100;
    recorder.start();
    process.stdout.write('abc');
    recorder.stop();

    expect(recorder.truncated()).toBe(false);
    recorder.exportScreenshot(path);
    expect(readFileSync(path, 'utf8')).toBe('abc');
  });
});
