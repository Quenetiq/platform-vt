import type { Type } from '@angular/core';
import { bootstrapTerminal } from '../bootstrap';

export function renderCli(rootComponent: Type<unknown>): Promise<void> {
  return bootstrapTerminal(rootComponent).then(() => {
    // App is running
  });
}
