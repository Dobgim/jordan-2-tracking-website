import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// The admin dashboard is its own HTML entry (admin.html) with its own
// stylesheet, so Tailwind never loads into it. Serve it at /admin and
// /admin/* (vercel.json does the same in production).
function adminRoutes() {
  const rewrite = (req, _res, next) => {
    const path = req.url.split('?')[0];
    if (path === '/admin' || path === '/admin/' || (path.startsWith('/admin/') && !path.includes('.'))) {
      req.url = '/admin.html';
    }
    next();
  };
  return {
    name: 'admin-routes',
    configureServer: (server) => void server.middlewares.use(rewrite),
    configurePreviewServer: (server) => void server.middlewares.use(rewrite),
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), adminRoutes()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        admin: fileURLToPath(new URL('./admin.html', import.meta.url)),
      },
    },
  },
  server: { port: 5290, strictPort: true },
  preview: { port: 5290, strictPort: true },
});
