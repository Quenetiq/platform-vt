# Dialog

Modal dialogs with a focus trap, opened through `DialogService`.

## Confirm

```typescript
const dialogs = inject(DialogService);
if (await dialogs.confirm({ message: 'Delete this file?', confirmLabel: 'Delete' })) {
  deleteFile();
}
```

## Prompt

```typescript
const name = await dialogs.prompt({
  message: 'Project name',
  defaultValue: 'my-app',
  validator: required('Name is required'),
});
```

`prompt` resolves with the value or `null` on cancel/Esc.

## Template dialogs

```html
<ng-template #settings let-close="close">
  <vt-box flexDirection="column" [gap]="1">
    <vt-text content="Settings"></vt-text>
    <vt-button label="Done" (clicked)="close()"></vt-button>
  </vt-box>
</ng-template>
```

```typescript
dialogs.openTemplate({ template: settings, title: 'Settings', width: 40 });
```

## Behavior

- Esc closes (disable with `closeOnEscape: false`).
- Enter submits (controlled by `closeOnEnter`).
- Tab/Shift+Tab cycle only inside the dialog (focus trap).
- Clicking outside is opt-in (`closeOnOutsideClick`).
- `open(Component, inputs, options)` opens any component; `activeDialog()`
  exposes the current `DialogRef`.

`DialogService` requires `provideOverlay()`.
