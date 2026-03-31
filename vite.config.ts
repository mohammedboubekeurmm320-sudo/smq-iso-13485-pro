import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Enable code splitting
    rollupOptions: {
      output: {
        // Manual chunks for better code splitting
        manualChunks: {
          // React and its ecosystem
          'vendor-react': [
            'react',
            'react-dom',
            'react-router-dom',
          ],
          // TanStack Query (React Query)
          'vendor-query': [
            '@tanstack/react-query',
          ],
          // UI components
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-slot',
          ],
          // Icons and utilities
          'vendor-icons': [
            'lucide-react',
            'clsx',
            'tailwind-merge',
          ],
          // Charts and visualization
          'vendor-charts': [
            'recharts',
          ],
        },
      },
    },
    // Chunk size warning limit
    chunkSizeWarningLimit: 600,
    // Minify options - use esbuild (default, no extra install needed)
    minify: 'esbuild',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react',
    ],
  },
}));
