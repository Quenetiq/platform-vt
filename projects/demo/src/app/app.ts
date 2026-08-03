import { Component, computed, signal } from '@angular/core';
import {
  BoxComponent,
  TextComponent,
  NewlineComponent,
  SpacerComponent,
  InputComponent,
  CaretComponent,
  SpinnerComponent,
  ScrollViewComponent,
} from '@quenetiq/platform-vt';

interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
  text: string;
}

const COST_PER_TOKEN = 0.000004;

@Component({
  selector: 'app-root',
  imports: [
    BoxComponent,
    TextComponent,
    NewlineComponent,
    SpacerComponent,
    InputComponent,
    CaretComponent,
    SpinnerComponent,
    ScrollViewComponent,
  ],
  template: `
    <vt-box flexDirection="column" [flexGrow]="1">

      @if (messages().length === 0) {
        <vt-text
          content="Welcome to Terminal Assistant — try \`help\`, \`code\` or \`fix\`"
          [color]="'#8b949e'"
          [wrap]="'wrap'"
          [padding]="'0 0 0 3'"
        ></vt-text>
      }

      <vt-scroll flexDirection="column" [flexGrow]="1" [padding]="'1 0 0 0'" [gap]="1">
        @for (msg of messages(); track $index) {
          @if (msg.role === 'user') {
            <vt-box class="user" flexDirection="column">
              <vt-text [content]="msg.text" [wrap]="'wrap'"></vt-text>
            </vt-box>
          } @else if (msg.role === 'tool') {
            <vt-box class="block" flexDirection="column">
              <vt-text [content]="msg.text" [wrap]="'wrap'" [color]="'#3fb950'"></vt-text>
            </vt-box>
          } @else {
            <vt-box class="block" flexDirection="column">
              <vt-text [content]="msg.text" [wrap]="'wrap'"></vt-text>
            </vt-box>
          }
        }

        @if (thinking()) {
          <vt-box class="block" flexDirection="row">
            <vt-spinner type="dots" label="Thinking..."></vt-spinner>
          </vt-box>
        }
      </vt-scroll>

      <vt-newline></vt-newline>

      <vt-box
        class="input"
        flexDirection="row"
        [height]="3"
        [alignItems]="'center'"
        [gap]="1"
      >
        <vt-input [autofocus]="true" (submitted)="addReply($event)">
          <vt-caret [blink]="true" color="#58a6ff"></vt-caret>
        </vt-input>
      </vt-box>

      <vt-box flexDirection="column" [padding]="'0 0 0 3'">
        <vt-box flexDirection="row">
          <vt-text content="local · default · ~/demo" [color]="'#8b949e'"></vt-text>
          <vt-spacer></vt-spacer>
          <vt-text content="? for shortcuts · v1.0.0" [color]="'#8b949e'"></vt-text>
        </vt-box>
        <vt-box flexDirection="row">
          <vt-text [content]="taskLabel()" [color]="'#8b949e'" [wrap]="'wrap'"></vt-text>
          <vt-spacer></vt-spacer>
          <vt-text [content]="usageLabel()" [color]="'#8b949e'"></vt-text>
        </vt-box>
      </vt-box>

    </vt-box>
  `,
})
export class App {
  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly thinking = signal(false);

  protected readonly taskLabel = computed(() => {
    const text = this.lastUserMessage;
    return `task · ${text ? this.truncate(text, 28) : '—'}`;
  });

  protected readonly usageLabel = computed(() => {
    const n = this.messages().length;
    if (n === 0) return 'ctx 0 · tok 0 / 200k · $0.0000';
    const tokens = Math.ceil(this.totalChars / 4).toLocaleString('en-US');
    const cost = (this.totalChars * COST_PER_TOKEN).toFixed(4);
    return `ctx ${n} · tok ${tokens} / 200k · $${cost}`;
  });

  addReply(value: string): void {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text || this.thinking()) return;

    this.messages.update(m => [...m, { role: 'user', text }]);
    this.simulateReply(text);
  }

  private get totalChars(): number {
    let sum = 0;
    for (const msg of this.messages()) sum += msg.text.length;
    return sum;
  }

  private get lastUserMessage(): string | undefined {
    const msgs = this.messages();
    for (let i = msgs.length - 1; i >= 0; i--) {
      const msg = msgs[i];
      if (msg && msg.role === 'user') return msg.text;
    }
    return undefined;
  }

  private truncate(text: string, max: number): string {
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1)}…`;
  }

  private simulateReply(prompt: string): void {
    this.thinking.set(true);
    const steps = this.buildSteps(prompt);

    let i = 0;
    const timer = setInterval(() => {
      if (i >= steps.length) {
        clearInterval(timer);
        this.thinking.set(false);
        return;
      }
      this.messages.update(m => [...m, steps[i] as ChatMessage]);
      i++;
    }, 700);
  }

  private buildSteps(prompt: string): ChatMessage[] {
    const p = prompt.toLowerCase();

    if (p.startsWith('/help')) {
      return [
        { role: 'tool', text: '✓ Loaded help topic' },
        {
          role: 'assistant',
          text: 'I can explain, fix, refactor, test, or document your code.\n\nAsk me anything about this project.',
        },
      ];
    }

    if (p.includes('hello') || p.includes('hi') || p === 'hey') {
      return [
        { role: 'tool', text: '✓ Context loaded' },
        { role: 'assistant', text: 'Hi! How can I help?' },
      ];
    }

    if (p.includes('help')) {
      return [
        { role: 'tool', text: '✓ Loaded help topic' },
        {
          role: 'assistant',
          text: 'I can explain, fix, refactor, test, or document your code.',
        },
      ];
    }

    if (p.includes('code') || p.includes('write') || p.includes('build')) {
      return [
        { role: 'tool', text: '⟳ Searching codebase…' },
        { role: 'tool', text: '✓ Found 3 relevant files' },
        {
          role: 'assistant',
          text: "Here's my take:\n\n  const demo = new App();\n  demo.render();\n\nI'd start there and iterate. What exactly are you trying to build?",
        },
      ];
    }

    if (p.includes('bug') || p.includes('error') || p.includes('fix')) {
      return [
        { role: 'tool', text: '⟳ Reading error output…' },
        { role: 'tool', text: '✓ Reproduced the issue' },
        {
          role: 'assistant',
          text: 'Found it — the error comes from a null check missing before the render call.\n\nAdd a guard and it should pass.',
        },
      ];
    }

    return [
      { role: 'tool', text: '⟳ Searching codebase…' },
      {
        role: 'assistant',
        text: `Got it: "${prompt.slice(0, 60)}"\n\nI'm on it. Let me look into the relevant parts and get back to you.`,
      },
    ];
  }
}
