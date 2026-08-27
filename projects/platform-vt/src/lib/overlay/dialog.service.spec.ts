import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideZonelessChangeDetection, Component, viewChild, TemplateRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DialogService } from './dialog.service';
import { provideOverlay } from './overlay.service';
import { RenderService } from '../services/render.service';
import { TerminalService } from '../services/terminal.service';
import { InputService } from '../services/input.service';
import { FocusService } from '../services/focus.service';
import { provideClickService } from '../services/click.service';
import { provideKeymapService } from '../services/keymap.service';
import { cleanupDom } from '../testing/cleanup-dom';
import { required } from '../forms/validators';
import { BoxComponent } from '../components/box/box.component';
import { TextComponent } from '../components/text/text.component';

@Component({
  selector: 'vt-dialog-host',
  imports: [BoxComponent, TextComponent],
  template: `
    <ng-template #settings>
      <vt-box flexDirection="column" [gap]="1">
        <vt-text content="volume: 40"></vt-text>
        <vt-text content="Save" color="green"></vt-text>
      </vt-box>
    </ng-template>
  `,
})
class DialogHostComponent {
  readonly settings = viewChild('settings', { read: TemplateRef });
}

describe('DialogService', () => {
  let dialogs: DialogService;
  let focus: FocusService;
  let input: InputService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TerminalService,
        RenderService,
        InputService,
        FocusService,
        DialogService,
        provideClickService(),
        provideKeymapService(),
        provideOverlay(),
        provideZonelessChangeDetection(),
      ],
    });
    const terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);

cleanupDom();
        dialogs = TestBed.inject(DialogService);
    focus = TestBed.inject(FocusService);
    input = TestBed.inject(InputService);
  });

  function press(name: string, ctrl = false): void {
    input.simulateKey({ name, ctrl, meta: false, shift: false, sequence: name });
  }

  const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

  it('opens with a focus trap and releases it on close', async () => {
    const promise = dialogs.confirm({ message: 'Sure?' });
    await tick();

    // The trap is active and something inside the dialog has focus.
    expect(focus.trapElement()).not.toBeNull();
    expect(focus.focusedId()).not.toBeNull();

    // Enter activates the autofocused confirm button → resolves true.
    press('return');
    await expect(promise).resolves.toBe(true);
    await tick();
    expect(focus.trapElement()).toBeNull();
  });

  it('confirm resolves false on escape', async () => {
    const promise = dialogs.confirm({ message: 'Sure?' });
    await tick();
    press('escape');
    await expect(promise).resolves.toBe(false);
    await tick();
    expect(focus.trapElement()).toBeNull();
  });

  it('confirm resolves false when cancelled via the cancel button', async () => {
    const promise = dialogs.confirm({ message: 'Sure?', cancelLabel: 'No' });
    await tick();

    // Move focus to the cancel button (next tab), then activate it.
    press('tab');
    press('return');
    await expect(promise).resolves.toBe(false);
    await tick();
    expect(focus.trapElement()).toBeNull();
  });

  it('prompt collects input and resolves the value on submit', async () => {
    const promise = dialogs.prompt({ message: 'Name?' });
    await tick();

    press('a');
    press('b');
    press('return');
    await expect(promise).resolves.toBe('ab');
    await tick();
    expect(focus.trapElement()).toBeNull();
  });

  it('prompt resolves null on escape', async () => {
    const promise = dialogs.prompt({ message: 'Name?' });
    await tick();
    press('escape');
    await expect(promise).resolves.toBeNull();
    await tick();
    expect(focus.trapElement()).toBeNull();
  });

  it('prompt enforces the validator', async () => {
    const promise = dialogs.prompt({ message: 'Name?', validator: required('Name required') });
    await tick();

    // Empty submit is rejected and does not resolve.
    press('return');
    await tick();
    expect(focus.trapElement()).not.toBeNull();

    press('x');
    press('return');
    await expect(promise).resolves.toBe('x');
  });

  it('openTemplate renders projected layout inside a framed dialog', async () => {
    const fixture = TestBed.createComponent(DialogHostComponent);
    fixture.detectChanges();
    const template = fixture.componentInstance.settings();

    const ref = dialogs.openTemplate({ template: template!, title: 'Settings', width: 30 });
    await tick();

    // The projected content is laid out inside the frame in the overlay layer.
    const panel = ref.overlay.hostElement;
    expect(panel.querySelector('vt-dialog-frame')).not.toBeNull();
    const texts = Array.from(panel.querySelectorAll('vt-text'));
    expect(texts.some((t) => t.getAttribute('content')?.includes('volume: 40'))).toBe(true);
    expect(texts.some((t) => t.getAttribute('content') === 'Settings')).toBe(true);

    ref.close();
    await tick();
    expect(focus.trapElement()).toBeNull();
  });
});