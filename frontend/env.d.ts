/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITEST?: boolean
  readonly VITE_FEATURE_ASL_TABLES?: string
  readonly VITE_FEATURE_AFV_VS_AFV?: string
}

declare module 'markdown-it-sup' {
  import type MarkdownIt from 'markdown-it'

  const plugin: MarkdownIt.PluginSimple
  export default plugin
}
