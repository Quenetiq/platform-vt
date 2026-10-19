# Link

An OSC 8 clickable hyperlink.

## Usage

```html
<vt-link href="https://angular.dev" content="Angular"></vt-link>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `content` | `string` | — | Visible text (required) |
| `href` | `string` | — | Target URL (required) |
| `linkId` | `string` | `''` | Optional link id for grouping |

Most terminals require Ctrl/Cmd+click to open links.

## Security

At paint time, control characters are stripped and `javascript:`, `data:` and
`vbscript:` URLs are rejected. Add any additional scheme allowlist in your
application if links come from untrusted input.
