/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITEST?: boolean
}

declare module 'markdown-it-sup' {
  import type MarkdownIt from 'markdown-it'

  const plugin: MarkdownIt.PluginSimple
  export default plugin
}
