import { bootstrapTerminal, provideOverlay, provideStyles } from '@quenetiq/platform-vt';
import { App } from './app/app';

bootstrapTerminal(App, {
  providers: [provideOverlay(), provideStyles({ stylesUrl: './projects/demo/src/styles.vt' })],
  terminalBackground: 'black',
  terminalForeground: 'bright-white',
}).catch((err) => console.error(err));

export default App;
