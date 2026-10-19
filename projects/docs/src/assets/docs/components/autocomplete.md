# Autocomplete

A text input with a suggestion list filtered as you type.

## Usage

```html
<vt-autocomplete
  [options]="cities"
  placeholder="City"
  (valueChange)="query.set($event)"
  (selected)="pick($event)">
</vt-autocomplete>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `options` | `string[]` | `[]` | Suggestion source |
| `value` | `string` | `''` | Initial text |
| `placeholder` | `string` | `''` | Placeholder |
| `maxSuggestions` | `number` | `5` | Visible suggestions |
| `autofocus` | `boolean` | `false` | Focus on mount |

## Outputs

| Output | Type | Description |
|---|---|---|
| `valueChange` | `string` | Text changed |
| `selected` | `string` | A suggestion was accepted |

## Keyboard

| Key | Action |
|---|---|
| Up / Down | Move the suggestion highlight |
| Tab / Enter | Accept the highlighted suggestion |
| Esc | Close the suggestion list |

Suggestions are ranked with the library's fuzzy matcher, so partial and
out-of-order input still finds candidates.
