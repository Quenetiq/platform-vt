import type { VTKeyEvent } from './input.service';

/**
 * Parser for the kitty keyboard protocol.
 *
 * The kitty protocol (implemented by kitty, wezterm, foot, ghostty, iTerm2,
 * Alacritty, Windows Terminal and others) disambiguates legacy key encodings
 * (Ctrl+I vs Tab, Escape vs Alt+[) and reports modifiers explicitly. The app
 * opts in by pushing keyboard mode with the "disambiguate escape codes" flag:
 *
 * - enable:  `CSI > 1 u` (push flags=1 onto the keyboard-mode stack)
 * - disable: `CSI < u`   (pop one entry)
 * - query:   `CSI ? u`   → terminal replies `CSI ? <flags> u`
 *
 * While the flag is active, modified keys are reported as:
 *
 * - `CSI <key>; <mods> u`             — Unicode codepoint of the (unshifted)
 *   key plus the modifier bitmask. Letters are always lowercase: Ctrl+Shift+A
 *   is `CSI 97;6 u`, never `CSI 65;6 u`.
 * - `CSI 1; <mods> <letter>`          — arrows, Home/End, F1-F4
 * - `CSI <num>; <mods> ~`             — Insert, Delete, PageUp/PageDown, F5+
 *
 * The modifier value is encoded as `1 + bitmask` (1=shift, 2=alt, 4=ctrl,
 * 8=super, 16=hyper, 32=meta); absent = 1 (no modifiers). Enter, Tab and
 * Backspace keep their legacy encodings for shell-safety (`reset`).
 *
 * @see https://sw.kovidgoyal.net/kitty/keyboard-protocol/
 */

/** Push keyboard mode with the disambiguate-escape-codes flag. */
export const KITTY_PUSH = '\x1b[>1u';
/** Pop one entry from the keyboard-mode stack. */
export const KITTY_POP = '\x1b[<u';
/** Query the current progressive-enhancement flags. */
export const KITTY_QUERY = '\x1b[?u';

/** Reply `CSI ? <flags> u`; flag bit 1 = disambiguate escape codes. */
const KITTY_QUERY_RESPONSE_RE = /^\x1b\[\?(\d+)u/;

const KITTY_KEY_RE = /^\x1b\[(\d+)(?:;(\d+))?u/;
const KITTY_CSI_1_RE = /^\x1b\[1;(\d+)([ABCDEFHPQS])/;
const KITTY_CSI_TILDE_RE = /^\x1b\[(\d+);(\d+)~/;

/** Modifier bitmask values as defined by the protocol. */
const SHIFT = 1;
const ALT = 2;
const CTRL = 4;
const SUPER = 8;
const HYPER = 16;
const META = 32;

/** Key names for the small set of codes that predate the PUA (incl. legacy). */
const FUNCTIONAL_KEYS: Record<number, string> = {
  9: 'tab',
  13: 'return',
  27: 'escape',
  32: 'space',
  127: 'backspace',
};

/** F1..F24 live in the Private Use Area, starting at 57344. */
const PUA_F1 = 57344;
const PUA_F24 = 57367;

/** `CSI 1; <mods> <letter>` — arrows, Home/End, F1-F4. */
const CSI_1_KEYS: Record<string, string> = {
  A: 'up',
  B: 'down',
  C: 'right',
  D: 'left',
  H: 'home',
  F: 'end',
  P: 'f1',
  Q: 'f2',
  R: 'f3',
  S: 'f4',
};

/** `CSI <num>; <mods> ~` — Insert, Delete, PageUp/PageDown, F5-F12. */
const CSI_TILDE_KEYS: Record<number, string> = {
  2: 'insert',
  3: 'delete',
  5: 'page-up',
  6: 'page-down',
  15: 'f5',
  17: 'f6',
  18: 'f7',
  19: 'f8',
  20: 'f9',
  21: 'f10',
  23: 'f11',
  24: 'f12',
};

/**
 * Extract a `CSI ? <flags> u` support response from the start of a chunk.
 *
 * @param data - Raw stdin chunk.
 * @returns The response sequence, or null if the chunk does not start with one.
 */
export function matchKittyQueryResponse(data: string): string | null {
  const match = KITTY_QUERY_RESPONSE_RE.exec(data);
  return match ? match[0] : null;
}

/** The disambiguate-escape-codes flag value from a support response. */
export function kittyQueryFlags(sequence: string): number | null {
  const match = KITTY_QUERY_RESPONSE_RE.exec(sequence);
  return match ? Number(match[1]) : null;
}

/**
 * Match a complete kitty key sequence at the start of a string.
 *
 * @param data - The remaining input, positioned at an escape byte.
 * @returns The matched sequence, or null.
 */
export function matchKittyKeySequence(data: string): string | null {
  for (const regex of [KITTY_KEY_RE, KITTY_CSI_1_RE, KITTY_CSI_TILDE_RE]) {
    const match = regex.exec(data);
    if (match) return match[0];
  }
  return null;
}

/**
 * Parse a kitty key sequence into a {@link VTKeyEvent}.
 *
 * @param sequence - A complete sequence matched by {@link matchKittyKeySequence}.
 * @returns The parsed event, or null if the sequence is not a kitty key.
 */
export function parseKittyKey(sequence: string): VTKeyEvent | null {
  let name: string | undefined;
  let mods: number;

  const keyMatch = KITTY_KEY_RE.exec(sequence);
  if (keyMatch) {
    name = kittyKeyName(Number(keyMatch[1]));
    mods = keyMatch[2] ? Number(keyMatch[2]) : 1;
  } else {
    const csi1 = KITTY_CSI_1_RE.exec(sequence);
    if (csi1) {
      name = CSI_1_KEYS[csi1[2]];
      mods = Number(csi1[1]);
    } else {
      const tilde = KITTY_CSI_TILDE_RE.exec(sequence);
      if (!tilde) return null;
      name = CSI_TILDE_KEYS[Number(tilde[1])];
      mods = Number(tilde[2]);
    }
  }

  if (!name) return null;

  // The modifier field is encoded as 1 + bitmask.
  const modifiers = Math.max(0, mods - 1);

  return {
    name,
    ctrl: (modifiers & CTRL) !== 0,
    meta: (modifiers & (ALT | SUPER | HYPER | META)) !== 0,
    shift: (modifiers & SHIFT) !== 0,
    sequence,
  };
}

function kittyKeyName(code: number): string {
  const functional = FUNCTIONAL_KEYS[code];
  if (functional) return functional;

  // The protocol mandates the unshifted (lowercase) code for letters.
  if (code >= 65 && code <= 90) return String.fromCharCode(code + 32);
  if (code >= 97 && code <= 122) return String.fromCharCode(code);
  if (code >= 32 && code <= 126) return String.fromCharCode(code);

  if (code >= PUA_F1 && code <= PUA_F24) {
    return `f${String(code - PUA_F1 + 1)}`;
  }

  return String.fromCharCode(code);
}
