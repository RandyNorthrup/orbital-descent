import { defineConfig } from 'vite';

// Base path is left at the default ('/') until a hosting target is chosen.
// See PLAN.md "Open Questions" — GitHub Pages requires base: '/<repo-name>/'.
export default defineConfig({
  build: {
    target: 'es2023',
    sourcemap: true,
  },
});
