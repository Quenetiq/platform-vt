/**
 * Sanitization helpers for untrusted terminal content.
 *
 * Terminals interpret control characters and escape sequences. Rendering
 * untrusted strings (logs, API data, file names, markdown) without stripping
 * them lets content inject OSC 52 clipboard writes, hyperlinks, title changes
 * or cursor movement. The renderer sanitizes every painted cell and every OSC
 * payload as a last line of defense.
 */

/** C0/C1 control characters (ESC, BEL, newlines, tabs, …). */
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g;

/** Unicode bidi control characters (may spoof visual order). */
const BIDI_CONTROLS = /[\u202A-\u202E\u2066-\u2069]/g;

/** Maximum length of an OSC payload (title, notification, URL). */
export const MAX_OSC_PAYLOAD = 4096;

/**
 * Strip terminal control and bidi characters from rendered cell text.
 *
 * Newlines are stripped too: the renderer splits lines before painting, so a
 * control character inside a cell must never reach the terminal.
 */
export function sanitizeText(text: string): string {
  return text.replace(CONTROL_CHARS, '').replace(BIDI_CONTROLS, '');
}

/**
 * Sanitize a payload embedded in an OSC sequence.
 *
 * Control characters and bidi controls are replaced with spaces, and the
 * result is truncated to {@link MAX_OSC_PAYLOAD}. This prevents a payload
 * from terminating the OSC sequence early (`BEL` / `ST`) and injecting
 * another escape sequence.
 */
export function sanitizeOscPayload(value: string): string {
  return value
    .replace(CONTROL_CHARS, ' ')
    .replace(BIDI_CONTROLS, '')
    .slice(0, MAX_OSC_PAYLOAD);
}

/**
 * Sanitize an OSC 8 hyperlink target.
 *
 * In addition to control characters, script-ish URI schemes are rejected so
 * a clicked link cannot execute code or embed data.
 *
 * @returns A safe URL, or an empty string when the URL is not allowed.
 */
export function sanitizeHyperlink(url: string): string {
  const clean = sanitizeOscPayload(url).trim();
  if (clean.length === 0) return '';
  if (/^(?:javascript|data|vbscript):/i.test(clean)) return '';
  return clean;
}

/**
 * Whether a string contains terminal control characters.
 *
 * Useful for validating untrusted input before storing/serializing it.
 */
export function hasControlChars(value: string): boolean {
  CONTROL_CHARS.lastIndex = 0;
  return CONTROL_CHARS.test(value);
}
