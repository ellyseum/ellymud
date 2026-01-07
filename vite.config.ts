import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Plugin to move game files from /game/ to root after build
function moveGameToRoot(): Plugin {
  return {
    name: 'move-game-to-root',
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist/public');
      const gameDir = path.join(outDir, 'game');
      
      if (fs.existsSync(gameDir)) {
        // Move game/index.html to root
        const gameIndex = path.join(gameDir, 'index.html');
        if (fs.existsSync(gameIndex)) {
          fs.renameSync(gameIndex, path.join(outDir, 'index.html'));
        }
        // Remove empty game directory
        fs.rmdirSync(gameDir);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), moveGameToRoot()],
  root: 'src/frontend',
  publicDir: false, // No public directory copying
  build: {
    outDir: '../../dist/public',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/frontend/game/index.html'),
        admin: path.resolve(__dirname, 'src/frontend/admin/index.html'),
      },
      output: {
        // Game client outputs to root, admin to /admin/
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'admin') {
            return 'admin/assets/[name]-[hash].js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Route admin assets to admin folder
          if (assetInfo.name?.includes('admin')) {
            return 'admin/assets/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:8080',
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/frontend/admin/src'),
      '@shared': path.resolve(__dirname, 'src/frontend/shared'),
    },
  },
});
