# Date Picker

A month calendar for selecting a date with the keyboard or mouse.

## Usage

```html
<vt-datepicker
  [value]="date()"
  (valueChange)="date.set($event)">
</vt-datepicker>
```

`value` is an ISO date string (`YYYY-MM-DD`) or `null`.

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `value` | `string \| null` | `null` | Selected ISO date |
| `min` / `max` | `string \| null` | `null` | Selectable range |
| `firstDayOfWeek` | `0 \| 1` | `1` | Sunday (`0`) or Monday (`1`) first |
| `monthNames` | `string[]` | English | Custom month names |
| `weekdayNames` | `string[]` | `Su..Sa` | Weekday initials (Sunday first) |
| `autofocus` | `boolean` | `false` | Focus on mount |

## Outputs

| Output | Type | Description |
|---|---|---|
| `valueChange` | `string` | Selected ISO date |

## Keyboard

| Key | Action |
|---|---|
| Left / Right | Previous/next day |
| Up / Down | Previous/next week |
| PageUp / PageDown | Previous/next month |
| Home / End | First/last day of the month |
| Enter | Select the active day |

Clicking a day selects it; clicking the header arrows changes the month.

## Styling

- Active day: inverse video (while focused)
- Selected day: bold, bright cyan
- Today: underlined
- Out-of-range days: gray (not selectable)

## Form integration

`vt-form-field` accepts a `vt-datepicker` as its control; the submitted value
is the ISO date string.

```html
<vt-form-field name="due" label="Due date">
  <vt-datepicker [value]="due()" (valueChange)="due.set($event)"></vt-datepicker>
</vt-form-field>
```
