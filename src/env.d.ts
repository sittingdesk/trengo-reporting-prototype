/// <reference types="vite/client" />

// Tells TypeScript how to treat .vue single-file components when imported.
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
