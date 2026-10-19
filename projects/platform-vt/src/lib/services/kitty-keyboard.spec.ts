import { describe, it, expect } from 'vitest';
import {
  parseKittyKey,
  matchKittyKeySequence,
  matchKittyQueryResponse,
  kittyQueryFlags,
  KITTY_PUSH,
  KITTY_POP,
  KITTY_QUERY,
} from './kitty-keyboard';

describe('kitty keyboard protocol', () => {
  describe('control sequences', () => {
    it('push/pop/query use the documented encodings', () => {
      expect(KITTY_PUSH).toBe('\x1b[>1u');
      expect(KITTY_POP).toBe('\x1b[<u');
      expect(KITTY_QUERY).toBe('\x1b[?u');
    });
  });

  describe('matchKittyQueryResponse', () => {
    it('matches the support reply', () => {
      expect(matchKittyQueryResponse('\x1b[?1u')).toBe('\x1b[?1u');
      expect(matchKittyQueryResponse('\x1b[?0u')).toBe('\x1b[?0u');
      expect(matchKittyQueryResponse('abc\x1b[?1u')).toBeNull();
    });

    it('extracts the flags', () => {
      expect(kittyQueryFlags('\x1b[?1u')).toBe(1);
      expect(kittyQueryFlags('\x1b[?0u')).toBe(0);
      expect(kittyQueryFlags('\x1b[?3u')).toBe(3);
      expect(kittyQueryFlags('nope')).toBeNull();
    });
  });

  describe('matchKittyKeySequence', () => {
    it('matches CSI u, CSI 1;mods letter and CSI num;mods ~ forms', () => {
      expect(matchKittyKeySequence('\x1b[97u')).toBe('\x1b[97u');
      expect(matchKittyKeySequence('\x1b[99;5u')).toBe('\x1b[99;5u');
      expect(matchKittyKeySequence('\x1b[1;2A')).toBe('\x1b[1;2A');
      expect(matchKittyKeySequence('\x1b[15;5~')).toBe('\x1b[15;5~');
      expect(matchKittyKeySequence('\x1b[A')).toBeNull();
    });
  });

  describe('parseKittyKey', () => {
    it('parses an unmodified key', () => {
      expect(parseKittyKey('\x1b[97u')).toMatchObject({
        name: 'a',
        ctrl: false,
        meta: false,
        shift: false,
      });
    });

    it('parses ctrl+c with explicit modifiers', () => {
      expect(parseKittyKey('\x1b[99;5u')).toMatchObject({
        name: 'c',
        ctrl: true,
        meta: false,
        shift: false,
      });
    });

    it('parses ctrl+shift+a as the unshifted key with both modifiers', () => {
      expect(parseKittyKey('\x1b[97;6u')).toMatchObject({
        name: 'a',
        ctrl: true,
        shift: true,
        meta: false,
      });
    });

    it('treats uppercase codes as lowercase (protocol says unshifted)', () => {
      expect(parseKittyKey('\x1b[84;6u')).toMatchObject({ name: 't', ctrl: true, shift: true });
    });

    it('maps alt/super/hyper/meta onto the meta flag', () => {
      expect(parseKittyKey('\x1b[97;3u')).toMatchObject({ name: 'a', meta: true, shift: false });
      expect(parseKittyKey('\x1b[97;9u')).toMatchObject({ name: 'a', meta: true });
      expect(parseKittyKey('\x1b[97;33u')).toMatchObject({ name: 'a', meta: true });
    });

    it('parses special keys by their codepoint', () => {
      expect(parseKittyKey('\x1b[27u')).toMatchObject({ name: 'escape', ctrl: false });
      expect(parseKittyKey('\x1b[32u')).toMatchObject({ name: 'space' });
      expect(parseKittyKey('\x1b[57344u')).toMatchObject({ name: 'f1' });
      expect(parseKittyKey('\x1b[57367u')).toMatchObject({ name: 'f24' });
    });

    it('parses arrows/home/end/f1-f4 via CSI 1;mods letter', () => {
      expect(parseKittyKey('\x1b[1;2A')).toMatchObject({ name: 'up', shift: true });
      expect(parseKittyKey('\x1b[1;5B')).toMatchObject({ name: 'down', ctrl: true });
      expect(parseKittyKey('\x1b[1;6D')).toMatchObject({ name: 'left', ctrl: true, shift: true });
      expect(parseKittyKey('\x1b[1;2H')).toMatchObject({ name: 'home', shift: true });
      expect(parseKittyKey('\x1b[1;2P')).toMatchObject({ name: 'f1', shift: true });
    });

    it('parses insert/delete/pageup/pagedown/f5+ via CSI num;mods ~', () => {
      expect(parseKittyKey('\x1b[2;5~')).toMatchObject({ name: 'insert', ctrl: true });
      expect(parseKittyKey('\x1b[3;5~')).toMatchObject({ name: 'delete', ctrl: true });
      expect(parseKittyKey('\x1b[5;2~')).toMatchObject({ name: 'page-up', shift: true });
      expect(parseKittyKey('\x1b[15;2~')).toMatchObject({ name: 'f5', shift: true });
      expect(parseKittyKey('\x1b[24;2~')).toMatchObject({ name: 'f12', shift: true });
    });

    it('rejects non-kitty sequences', () => {
      expect(parseKittyKey('\x1b[A')).toBeNull();
      expect(parseKittyKey('\x1b[27;5;99~')).toBeNull();
      expect(parseKittyKey('hello')).toBeNull();
    });
  });
});
