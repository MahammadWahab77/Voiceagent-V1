# Replit Implementation Brief

This document outlines the necessary configurations and code changes for the **Replit Agent** to successfully deploy the Voiceagent V1 application on Replit. The primary goal is to **eliminate CORS issues** and ensure seamless communication between the frontend and backend.

## 🚀 Recommended Strategy: Serve Frontend from Backend
To completely avoid CORS issues (since Replit exposes a single public URL per Repl), the backend should serve the compiled frontend code. This places both the API and the UI on the **same origin**.

### 1. Environment Variables
The following environment variables must be configured in Replit's "Secrets" or Environment variables section:

| Variable | Description | Location |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Key for Google Gemini API | Backend |
| `SUPABASE_URL` | Supabase Project URL | Backend & Frontend |
| `SUPABASE_SECRET_KEY` | Supabase Service Role Key (Admin) | Backend |
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` | Frontend (Build time) |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon Key (Public) | Frontend (Build time) |

*Note: `PORT` is automatically handled by Replit (usually defaults to 3000).*

### 2. Codebase Changes Required

#### A. Frontend Configuration (`/frontend`)
The frontend currently hardcodes `localhost`. We need to switch to relative paths or environment variables.

1.  **Modify `src/hooks/useGeminiLive.ts`**:
    - Change `const URL = 'ws://localhost:3001/ws/chat';`
    - To:
      ```typescript
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const URL = `${protocol}//${host}/ws/chat`;
      ```
      *This automatically uses the correct Replit domain.*

2.  **Modify `src/pages/AdminDashboard.jsx`**:
    - Change `fetch('http://localhost:3001/api/admin/analytics', ...)`
    - To use a relative path: `fetch('/api/admin/analytics', ...)`

3.  **Update `vite.config.ts`**:
    - Ensure build output goes to a place the backend can access, or standard `dist`.
    ```typescript
    export default defineConfig({
      // ...
      build: {
        outDir: '../backend/public', // Build directly to backend's public folder
        emptyOutDir: true
      }
    });
    ```

#### B. Backend Configuration (`/backend`)
The backend needs to serve the static frontend files.

1.  **Install `@fastify/static`**:
    - Run `npm install @fastify/static` in the `backend` directory.

2.  **Update `src/server.js`**:
    - Import and register `@fastify/static`.
    - Serve files from the `public` directory (where frontend is built to).
    - **Crucial**: Add valid SPA (Single Page Application) fallback so valid React routes return `index.html`.

    ```javascript
    import path from 'path';
    import { fileURLToPath } from 'url';
    import fastifyStatic from '@fastify/static';

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // ... after other registers ...

    // Serve Static Frontend
    fastify.register(fastifyStatic, {
        root: path.join(__dirname, '../public'),
        prefix: '/', // Serve at root
    });

    // SPA Fallback: If route not found and not an API call, serve index.html
    fastify.setNotFoundHandler((request, reply) => {
        if (request.raw.url.startsWith('/api') || request.raw.url.startsWith('/ws')) {
             reply.status(404).send({ error: 'Endpoint not found' });
        } else {
             reply.sendFile('index.html');
        }
    });
    ```

### 3. Replit Configuration File (`.replit`)
Create or update `.replit` in the root to define the build and run process.

```toml
modules = ["nodejs-20"]

run = "npm run start"

[nix]
channel = "stable-24_05"

[env]
npm_config_prefix = "/home/runner/.npm-global"
PATH = "/home/runner/.npm-global/bin:/nix/var/nix/profiles/default/bin:/nix/var/nix/profiles/default/sbin:/bin:/sbin:/usr/bin:/usr/sbin"
```

**Root `package.json` (Optional but recommended for single-command start)**:
If a root `package.json` exists, add a start script that builds frontend and starts backend:
```json
"scripts": {
  "build": "cd frontend && npm install && npm run build",
  "start": "npm run build && cd backend && npm install && npm start"
}
```

### 4. Summary of Agent Tasks
1.  **Inject Secrets**: Add Supabase and Gemini keys to environment.
2.  **Refactor Frontend**: Replace `localhost` URLs with dynamic logic (`window.location`) or relative paths.
3.  **Update Build Path**: Point Vite build to `backend/public`.
4.  **Update Backend**: Serve `public` directory using `@fastify/static`.
5.  **Run**: Execute the build-and-start sequence.

This approach guarantees that **CORS is irrelevant** because the API and Frontend share the same Origin.
