# Security

Terminal UIs interpret escape sequences. Any untrusted string rendered into
the terminal (logs, API payloads, file names, markdown) is a potential
injection vector. The library applies defense in depth:

## Output sanitization

Every painted cell passes through `sanitizeText()`:

- C0/C1 control characters (ESC, BEL, newlines, tabs) are stripped.
- Unicode bidi control characters (`U+202A`–`U+202E`, `U+2066`–`U+2069`) are
  stripped to prevent visual spoofing.
- Ordinary Unicode (CJK, emoji, RTL text) is preserved.

This blocks terminal escape injection even when a component forgets to
validate its input. The helpers are exported for app-level validation:

```typescript
import { sanitizeText, sanitizeOscPayload, sanitizeHyperlink, hasControlChars } from '@quenetiq/platform-vt';
```

## OSC payloads

Title, desktop notification, working-directory and color payloads are
sanitized before being embedded in OSC sequences, so `BEL`/`ST` inside user
content cannot terminate the sequence early. Payloads are capped at 4 KB.

OSC 8 hyperlinks reject `javascript:`, `data:` and `vbscript:` schemes.
`vt-link` and any component that sets the `hyperlink` style are covered by the
same check at paint time.

## Clipboard

OSC 52/5522 replies from the terminal are capped at 10 MB to avoid memory
exhaustion from a hostile or buggy terminal emulator.

## Images

- `vt-image` refuses files larger than `maxBytes` (10 MB by default) before
  reading them.
- PNG decoding enforces a pixel budget (8M pixels by default) and a hard
  dimension cap, preventing decompression bombs.
- Image `src` is a filesystem path chosen by the application. Validate or
  allowlist paths if they come from untrusted input.

## Persistence

- `PersistenceService` ignores `__proto__`, `prototype` and `constructor`
  keys when loading or saving state (no prototype pollution).
- State files are written with mode `0600`.
- Corrupt or unreadable files are ignored.

## Session recorder

- Captured output is capped at `maxBytes` (5 MB by default); the `truncated`
  signal reports when the limit was hit.
- Recordings are written with mode `0600`.
- Recordings may contain sensitive terminal output; treat them as secrets.

## Trusted-only inputs

- `vt-ansi-text` / `parseAnsi` intentionally interpret ANSI SGR sequences.
  Render only trusted, pre-sanitized ANSI text with it.
- `osc.*` helpers are low-level escape builders; user-facing wrappers
  (`TerminalService.setTitle` / `notify`) already sanitize their input.

## Reporting

Please report security issues privately to the maintainers instead of opening
a public issue.
