import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Detect if this build is targeting staging
  const isStaging =
    mode === 'staging' ||
    env.VITE_APP_ENV === 'staging' ||
    process.env.VITE_APP_ENV === 'staging' ||
    process.env.VERCEL_GIT_COMMIT_REF === 'staging';

  if (isStaging) {
    const apiUrl = process.env.VITE_API_BASE_URL || env.VITE_API_BASE_URL;

    if (!apiUrl || typeof apiUrl !== 'string' || apiUrl.trim() === '') {
      throw new Error(
        `\n======================================================\n` +
        `[FATAL CONFIG ERROR] Staging build failed:\n` +
        `VITE_API_BASE_URL is mandatory for staging builds but is missing or empty.\n` +
        `Staging builds must target: https://chalre-api-staging.onrender.com/api\n` +
        `Relative '/api' fallback is strictly disabled in staging.\n` +
        `======================================================\n`
      );
    }

    const trimmed = apiUrl.trim();

    if (trimmed.startsWith('/') || trimmed === '/api') {
      throw new Error(
        `\n======================================================\n` +
        `[FATAL CONFIG ERROR] Staging build failed:\n` +
        `VITE_API_BASE_URL cannot be relative ('${trimmed}') in staging.\n` +
        `It must be an absolute URL targeting the staging backend.\n` +
        `======================================================\n`
      );
    }

    if (
      trimmed.includes('chalre.onrender.com') &&
      !trimmed.includes('chalre-api-staging.onrender.com')
    ) {
      throw new Error(
        `\n======================================================\n` +
        `[CRITICAL ISOLATION ERROR] Staging build failed:\n` +
        `VITE_API_BASE_URL points to the PRODUCTION backend ('${trimmed}')!\n` +
        `Staging builds are strictly prohibited from targeting production.\n` +
        `Expected staging target: https://chalre-api-staging.onrender.com/api\n` +
        `======================================================\n`
      );
    }

    if (trimmed.includes('chalre.in') && !trimmed.includes('staging.chalre.in')) {
      throw new Error(
        `\n======================================================\n` +
        `[CRITICAL ISOLATION ERROR] Staging build failed:\n` +
        `VITE_API_BASE_URL points to production domain ('${trimmed}')!\n` +
        `======================================================\n`
      );
    }
  }

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  };
});
