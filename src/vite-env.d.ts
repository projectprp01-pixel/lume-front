/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the deployed lume-backend, e.g. https://api.example.com (no /api suffix). */
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
