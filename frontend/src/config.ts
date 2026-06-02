const apiUrl = import.meta.env['VITE_API_URL'];

if (!apiUrl) {
  if (import.meta.env['MODE'] === 'development') {
    console.warn(
      '[config] VITE_API_URL is not set. Check your .env.local file.'
    );
  }
}

export const API_URL: string = apiUrl ?? '';
