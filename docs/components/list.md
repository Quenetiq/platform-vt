# List

Scrollable list of selectable items with cursor navigation.

## Usage

```html
<vt-list [items]="items" [cursor]="cursor()" (selected)="onSelect($event)"></vt-list>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `items` | `string[]` | `[]` | List items |
| `cursor` | `number` | `0` | Currently highlighted index |
| `selectedItem` | `string \| undefined` | `undefined` | Currently selected item |

## Outputs

| Output | Type | Description |
|---|---|---|
| `selected` | `string` | Emitted when Enter is pressed on an item |
| `cursorChanged` | `number` | Emitted when cursor moves |

## Keyboard

| Key | Action |
|---|---|
| Up/K | Move cursor up |
| Down/J | Move cursor down |
| Enter | Select item |
| Home | Jump to first |
| End | Jump to last |
| Page Up | Move up by 10 |
| Page Down | Move down by 10 |

## Styling

- **Normal**: Default colors
- **Cursor**: Green background
- **Selected**: Cyan background

## Examples

### Basic

```html
<vt-list
  [items]="['Option A', 'Option B', 'Option C']"
  [cursor]="currentIdx()"
  (selected)="onSelect($event)"
  (cursorChanged)="currentIdx.set($event)">
</vt-list>
```

### With State Management

```typescript
export class AppComponent {
  protected readonly items = signal(['File', 'Edit', 'View', 'Help']);
  protected readonly cursor = signal(0);

  onSelect(item: string) {
    console.log('Selected:', item);
  }
}
```
