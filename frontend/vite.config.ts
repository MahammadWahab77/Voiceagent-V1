import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Changed from '0.0.0.0' to true for better compatibility
    strictPort: true
  }
});
