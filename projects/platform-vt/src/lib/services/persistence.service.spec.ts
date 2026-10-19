import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { PersistenceService } from './persistence.service';
import { TerminalService } from './terminal.service';

describe('PersistenceService security', () => {
  let dir: string;
  let service: PersistenceService;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'vt-persist-'));
    TestBed.configureTestingModule({ providers: [TerminalService, PersistenceService] });
    service = TestBed.inject(PersistenceService);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('ignores prototype-polluting keys from the state file', () => {
    const path = join(dir, 'state.json');
    writeFileSync(path, '{"safe":1,"__proto__":{"polluted":true}}');
    service.configure(path);

    const value = service.signal('safe', 0);
    expect(value()).toBe(1);
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it('does not persist unsafe keys and writes the file with mode 0600', () => {
    const path = join(dir, 'state.json');
    service.configure(path);
    service.save('__proto__', { polluted: true });
    service.save('theme', 'dark');
    service.flush();

    const raw = readFileSync(path, 'utf8');
    expect(raw).not.toContain('__proto__');
    expect(raw).toContain('theme');
    expect(statSync(path).mode & 0o777).toBe(0o600);
  });

  it('rejects empty paths', () => {
    expect(() => service.configure('')).toThrow(/non-empty/);
  });
});
