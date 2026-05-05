/// <reference types="vite/client" />

interface Navigator {
  standalone?: boolean;
}

interface ImportMetaEnv {
  readonly VITE_FIRESTORE_DATABASE_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
