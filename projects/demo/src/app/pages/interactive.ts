import { Component, signal } from '@angular/core';
import {
  BoxComponent,
  TextComponent,
  SeparatorComponent,
  NewlineComponent,
  ButtonComponent,
  InputComponent,
} from 'platform-vt';

@Component({
  selector: 'app-interactive-page',
  imports: [
    BoxComponent,
    TextComponent,
    SeparatorComponent,
    NewlineComponent,
    ButtonComponent,
    InputComponent,
  ],
  template: `
    <vt-box flexDirection="column" [gap]="1" [padding]="1" border="single">
      <vt-text color="cyan" fontWeight="bold">Interactive Demo</vt-text>
      <vt-separator></vt-separator>

      <vt-text fontWeight="bold">Input + Button</vt-text>
      <vt-box flexDirection="row" [gap]="1">
        <vt-input placeholder="Enter a message" (submitted)="addMessage($event)"></vt-input>
        <vt-button label="Add" (clicked)="addMessage('clicked')"></vt-button>
      </vt-box>

      <vt-newline></vt-newline>

      @if (messages().length > 0) {
        <vt-text fontWeight="bold">Messages ({{ messages().length }})</vt-text>
        <vt-box flexDirection="column" [gap]="1" [padding]="1" border="single">
          @for (msg of messages(); track msg) {
            <vt-text color="green">▸ {{ msg }}</vt-text>
          }
        </vt-box>
      }

      <vt-newline></vt-newline>

      <vt-text fontWeight="bold">Counter</vt-text>
      <vt-box flexDirection="row" [gap]="1" alignItems="center">
        <vt-button label="  -  " (clicked)="decrement()"></vt-button>
        <vt-text fontWeight="bold" [width]="6" color="yellow">{{ counter() }}</vt-text>
        <vt-button label="  +  " (clicked)="increment()"></vt-button>
        <vt-button label="Reset" (clicked)="reset()"></vt-button>
      </vt-box>

      <vt-newline></vt-newline>

      <vt-text fontWeight="bold">Status</vt-text>
      <vt-box flexDirection="column" [gap]="1" [padding]="1" border="single">
        <vt-box flexDirection="row" [gap]="1">
          <vt-text [width]="15">Messages:</vt-text>
          <vt-text color="green">{{ messages().length }}</vt-text>
        </vt-box>
        <vt-box flexDirection="row" [gap]="1">
          <vt-text [width]="15">Counter:</vt-text>
          <vt-text color="yellow">{{ counter() }}</vt-text>
        </vt-box>
        <vt-box flexDirection="row" [gap]="1">
          <vt-text [width]="15">Uptime:</vt-text>
          <vt-text color="cyan">{{ uptime() }}s</vt-text>
        </vt-box>
      </vt-box>

      <vt-separator></vt-separator>
      <vt-text color="gray">Type in the input and press Enter to add messages</vt-text>
    </vt-box>
  `,
  styles: [],
})
export class InteractivePageComponent {
  protected readonly messages = signal<string[]>([]);
  protected readonly counter = signal(0);
  protected readonly uptime = signal(0);

  constructor() {
    let seconds = 0;
    setInterval(() => {
      seconds++;
      this.uptime.set(seconds);
    }, 1000);
  }

  addMessage(text: string): void {
    if (text.trim()) {
      this.messages.update(msgs => [...msgs, text]);
    }
  }

  increment(): void {
    this.counter.update(c => c + 1);
  }

  decrement(): void {
    this.counter.update(c => c - 1);
  }

  reset(): void {
    this.counter.set(0);
  }
}
