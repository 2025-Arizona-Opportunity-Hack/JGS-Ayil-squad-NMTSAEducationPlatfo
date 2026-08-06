/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL: string;
  /** "propelauth" switches the build to external auth; unset = Convex Auth. */
  readonly VITE_AUTH_PROVIDER?: string;
  /** PropelAuth instance URL, required when VITE_AUTH_PROVIDER=propelauth. */
  readonly VITE_PROPELAUTH_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
