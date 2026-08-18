import type { BootstrapContext } from '@angular/platform-browser';
import { bootstrapTerminal, provideOverlay, provideStyles } from '@quenetiq/platform-vt';
import { App } from './app/app';

export default function bootstrap(context: BootstrapContext) {
  return bootstrapTerminal(
    App,
    {
      providers: [provideOverlay(), provideStyles({ stylesUrl: './projects/demo/src/styles.vt' })],
      terminalBackground: 'black',
      terminalForeground: 'bright-white',
    },
    context,
  );
}
