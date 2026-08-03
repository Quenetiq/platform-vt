/**
 * Allow importing `.vt` stylesheet files as raw text.
 * The file is inlined as a string at build time via the Angular `loader`
 * configuration (see the demo `build.options.loader` in `angular.json`).
 */
declare module '*.vt' {
  const content: string;
  export default content;
}
