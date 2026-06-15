import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Using relative base paths ('./') makes the build repository-agnostic.
  // The app will run perfectly on GitHub Pages regardless of whether it is hosted at
  // https://<username>.github.io/ (root) or https://<username>.github.io/<repo-name>/ (subfolder).
  base: './',
})
