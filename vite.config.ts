import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
// FIX: Import process to provide correct types for process.cwd()
import process from 'process';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Vite replaces env variables in client-side code, which is what this app needs.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.GOOGLE_API_KEY': JSON.stringify(env.GOOGLE_API_KEY),
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID),
    }
  }
})