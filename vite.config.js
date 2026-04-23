import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: './',
    build: {
      outDir: 'docs',
      emptyOutDir: true
    },
    define: {
      'import.meta.env.VITE_GITHUB_PAT': JSON.stringify(env.VITE_GITHUB_PAT || '')
    }
  };
});
