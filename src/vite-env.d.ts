/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIRESTORE_DATABASE_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
