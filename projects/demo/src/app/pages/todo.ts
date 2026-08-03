import { Component, signal, computed } from '@angular/core';
import {
  BoxComponent,
  TextComponent,
  SeparatorComponent,
  NewlineComponent,
  ButtonComponent,
  InputComponent,
  CheckboxComponent,
  SpacerComponent,
} from 'platform-vt';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

@Component({
  selector: 'app-todo-page',
  imports: [
    BoxComponent,
    TextComponent,
    SeparatorComponent,
    NewlineComponent,
    ButtonComponent,
    InputComponent,
    CheckboxComponent,
    SpacerComponent,
  ],
  template: `
    <vt-box flexDirection="column" [gap]="1" [padding]="1" border="single">
      <vt-text color="yellow" fontWeight="bold">Todo App</vt-text>
      <vt-separator></vt-separator>

      <vt-box flexDirection="row" [gap]="1">
        <vt-input placeholder="What needs to be done?" (submitted)="addTodo($event)"></vt-input>
        <vt-button label="Add" (clicked)="addTodo('')"></vt-button>
      </vt-box>

      <vt-newline></vt-newline>

      <vt-box flexDirection="row" [gap]="1" alignItems="center">
        <vt-text [width]="20">
          Total: {{ todos().length }}
        </vt-text>
        <vt-text [width]="20" color="green">
          Done: {{ doneCount() }}
        </vt-text>
        <vt-text [width]="20" color="red">
          Left: {{ remainingCount() }}
        </vt-text>
        <vt-spacer></vt-spacer>
        @if (todos().length > 0) {
          <vt-button label="Clear done" (clicked)="clearDone()"></vt-button>
        }
      </vt-box>

      <vt-separator></vt-separator>

      @if (todos().length === 0) {
        <vt-box flexDirection="column" [padding]="1" alignItems="center">
          <vt-text color="gray">Nothing to do. Add a task above!</vt-text>
        </vt-box>
      } @else {
        <vt-box flexDirection="column" [gap]="1" [padding]="1" border="single">
          @for (todo of todos(); track todo.id) {
            <vt-box flexDirection="row" [gap]="1" alignItems="center">
              <vt-checkbox
                [label]="todo.text"
                (checkedChange)="toggleTodo(todo.id, $event)"
              ></vt-checkbox>
              <vt-spacer></vt-spacer>
              <vt-button
                label="x"
                variant="danger"
                (clicked)="removeTodo(todo.id)"
              ></vt-button>
            </vt-box>
          }
        </vt-box>
      }

      <vt-separator></vt-separator>
      <vt-text color="gray">Tab to navigate. Enter to toggle. Ctrl+C to exit.</vt-text>
    </vt-box>
  `,
})
export class TodoPageComponent {
  private nextId = 1;
  protected readonly todos = signal<Todo[]>([]);

  protected readonly doneCount = computed(() =>
    this.todos().filter(t => t.done).length,
  );
  protected readonly remainingCount = computed(() =>
    this.todos().filter(t => !t.done).length,
  );

  addTodo(text: string): void {
    if (text.trim()) {
      this.todos.update(list => [
        ...list,
        { id: this.nextId++, text: text.trim(), done: false },
      ]);
    }
  }

  toggleTodo(id: number, done: boolean): void {
    this.todos.update(list =>
      list.map(t => (t.id === id ? { ...t, done } : t)),
    );
  }

  removeTodo(id: number): void {
    this.todos.update(list => list.filter(t => t.id !== id));
  }

  clearDone(): void {
    this.todos.update(list => list.filter(t => !t.done));
  }
}
