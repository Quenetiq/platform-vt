import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormComponent, FormFieldComponent } from './form.component';
import { InputComponent } from '../components/input/input.component';
import { required, type AsyncValidatorFn } from './validators';
import { RenderService } from '../services/render.service';
import { TerminalService } from '../services/terminal.service';
import { InputService } from '../services/input.service';
import { FocusService } from '../services/focus.service';
import { MouseService } from '../services/mouse.service';
import { provideClickService } from '../services/click.service';

@Component({
  selector: 'vt-form-host',
  imports: [FormComponent, FormFieldComponent, InputComponent],
  template: `
    <vt-form #form (submitted)="submitted.set($event)">
      <vt-form-field
        name="name"
        label="Name"
        [validators]="[required()]"
        [asyncValidators]="asyncValidators"
        [asyncDebounceMs]="0"
      >
        <vt-input placeholder="name"></vt-input>
      </vt-form-field>
    </vt-form>
  `,
})
class FormHostComponent {
  readonly required = required;
  asyncValidators: AsyncValidatorFn[] = [];
  readonly submitted = signal<Record<string, string> | null>(null);
}

describe('Form async validation', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FormHostComponent],
      providers: [
        TerminalService,
        RenderService,
        InputService,
        FocusService,
        MouseService,
        provideClickService(),
        provideZonelessChangeDetection(),
      ],
    });
    const terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);
  });

  it('runs async validators and exposes pending/error state', async () => {
    const fixture = TestBed.createComponent(FormHostComponent);
    const validator = vi.fn(
      (value: string): Promise<string | null> =>
        Promise.resolve(value === 'taken' ? 'Already taken' : null),
    );
    fixture.componentInstance.asyncValidators = [validator];
    fixture.detectChanges();

    const field = fixture.debugElement.query(By.directive(FormFieldComponent))
      .componentInstance as FormFieldComponent;
    field.value.set('taken');

    const pending = field.markTouched();
    expect(field.pending()).toBe(true);
    await pending;

    expect(validator).toHaveBeenCalledWith('taken');
    expect(field.error()).toBe('Already taken');
    expect(field.pending()).toBe(false);
    expect(field.touched()).toBe(true);
  });

  it('skips async validators when a sync validator fails', async () => {
    const fixture = TestBed.createComponent(FormHostComponent);
    const validator = vi.fn((): Promise<string | null> => Promise.resolve(null));
    fixture.componentInstance.asyncValidators = [validator];
    fixture.detectChanges();

    const field = fixture.debugElement.query(By.directive(FormFieldComponent))
      .componentInstance as FormFieldComponent;
    field.value.set('   ');
    await field.markTouched();

    expect(field.error()).toBe('This field is required');
    expect(validator).not.toHaveBeenCalled();
  });

  it('submits asynchronously and tracks dirty state', async () => {
    const fixture = TestBed.createComponent(FormHostComponent);
    fixture.componentInstance.asyncValidators = [
      (): Promise<string | null> => Promise.resolve(null),
    ];
    fixture.detectChanges();

    const field = fixture.debugElement.query(By.directive(FormFieldComponent))
      .componentInstance as FormFieldComponent;
    field.value.set('valid');
    field.dirty.set(true);

    const form = fixture.debugElement.query(By.directive(FormComponent))
      .componentInstance as FormComponent;
    const ok = await form.submitAsync();

    expect(ok).toBe(true);
    expect(fixture.componentInstance.submitted()).toEqual({ name: 'valid' });
    expect(form.dirty()).toBe(true);
  });

  it('reset clears validation, dirty and touched flags', async () => {
    const fixture = TestBed.createComponent(FormHostComponent);
    fixture.componentInstance.asyncValidators = [
      (): Promise<string | null> => Promise.resolve('nope'),
    ];
    fixture.detectChanges();

    const field = fixture.debugElement.query(By.directive(FormFieldComponent))
      .componentInstance as FormFieldComponent;
    field.value.set('x');
    await field.markTouched();
    expect(field.invalid()).toBe(true);

    field.reset();
    expect(field.error()).toBeNull();
    expect(field.touched()).toBe(false);
    expect(field.dirty()).toBe(false);
  });
});
