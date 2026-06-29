/**
 * Ambient module declarations for side-effect CSS imports.
 *
 * Next.js normally provides these via `next-env.d.ts`, but when that file is
 * missing (e.g. on a fresh clone, since it is .gitignored) the TypeScript
 * compiler raises TS2882 for `import "./globals.css"` in `src/app/layout.tsx`.
 * Declaring the modules here makes the side-effect import legal without
 * requiring a `next dev` / `next build` run.
 */
declare module '*.css';
declare module '*.scss';
declare module '*.sass';
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
declare module '*.module.sass' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
