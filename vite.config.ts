import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    // Force le pre-bundling immédiat pour éviter les rerenders pendant le dev
    force: false,
    // Exclure les modules problématiques du pre-bundling
    exclude: [],
  },
  server: {
    // Augmenter le délai de restart pour éviter les conflits de fichiers
    watch: {
      // Utiliser le polling sur Windows pour éviter les problèmes de verrouillage de fichiers
      usePolling: false,
      // Ignorer le cache Angular
      ignored: ['**/node_modules/**', '**/.angular/**']
    },
    fs: {
      // Permettre l'accès aux fichiers en dehors du root
      strict: false
    }
  },
  ssr: {
    // Options SSR pour éviter les problèmes de cache
    optimizeDeps: {
      // Ne pas forcer le pre-bundling en SSR
      force: false
    }
  },
  cacheDir: '.vite-cache'
});
